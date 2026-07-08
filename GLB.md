# GLB 로딩 및 감정/모션 구성 정리

이 문서는 현재 `apps/dawnlight` 구현 기준으로, 플레이어 아바타의 GLB 로딩 방식과 감정/모션 처리 방식을 정리합니다.

## 1) 사용 에셋

- 모델 GLB: `https://static.dawn.lt/glb/leafy-explorer/leafy-explorer-v2.glb`
- 애니메이션 GLB: `https://static.dawn.lt/glb/leafy-explorer/leafy-explorer-anim.glb`
- 스마일 텍스처: `https://static.dawn.lt/glb/leafy-explorer/smile.webp`

코드 위치:
- `apps/dawnlight/src/game/engine/player-avatar.ts`
- `apps/dawnlight/src/components/dawnlight-ui/avatar-preview.tsx`

## 2) 런타임 로딩 진입점

1. 게임 엔진 초기화 시 `PlayerAvatar` 인스턴스를 생성합니다.
2. 즉시 `playerAvatar.load()`를 비동기로 호출합니다.

코드 위치:
- `apps/dawnlight/src/game/engine/game-engine.ts`

## 3) GLB 로딩 방식

`PlayerAvatar.load()` 내부 동작:

1. `GLTFLoader` + `MeshoptDecoder` 설정
- `EXT_meshopt_compression` 압축된 GLB를 읽기 위해 `loader.setMeshoptDecoder(MeshoptDecoder)`를 사용합니다.

2. 모델/애니메이션 병렬 로딩
- `Promise.all([modelGLB, animationGLB])`로 동시에 다운로드합니다.
- 애니메이션 클립은 `animationGLB.animations`가 우선이며, 비어 있으면 모델의 내장 애니메이션을 fallback으로 사용합니다.

3. 모델 준비(`prepareAvatarModel`)
- 모든 Mesh를 순회하며 머티리얼 정규화(`MeshBasicMaterial -> MeshStandardMaterial` 변환 포함).
- 투명 + 텍스처 조합은 `alphaTest` 기반으로 정리.
- emissive를 제어 가능한 상태로 초기화.
- 바운딩 박스 기준으로 아바타 높이를 `PLAYER_HEIGHT * 1.02`에 맞춰 스케일.
- 바닥 기준으로 Y 오프셋 보정.
- Hip/Pelvis 본 탐색(루트 모션 보정용).

4. 애니메이션 액션 구성(`setupAvatarAnimations`)
- `AnimationMixer` 생성.
- 클립별 `AnimationAction` 등록(`LoopRepeat, Infinity`).
- idle/crouch/sneak/walk/run/jump/swimForward/swimIdle 액션을 alias/패턴으로 탐색해 바인딩.

5. 씬에 부착
- 로딩/설정 완료된 `modelRoot`를 씬에 추가.

## 4) 모션(애니메이션) 상태 구성

프레임 업데이트는 `AnimationLoop`에서 `updateLoopPlayerAvatar(...)`를 통해 `playerAvatar.update(...)`를 매 틱 호출하는 구조입니다.

코드 위치:
- `apps/dawnlight/src/game/engine/animation-loop.ts`
- `apps/dawnlight/src/game/engine/animation-loop-camera.ts`

`update(...)`의 상태 결정 우선순위:

1. 강제 디버그/감정 액션이 있으면 해당 액션 고정 재생
2. 수영 상태면 `swimForward/swimIdle`
3. 앉기(crouch) 상태면 crouch 액션
4. 점프 조건 충족 시 jump 액션
5. 이동 중이면 sneak/run/walk 중 하나
6. 이동이 없으면 idle 사이클(여러 idle 액션 랜덤 순환)

추가 동작:
- 이동 방향(`intendedMoveYaw`)에 따라 3인칭 아바타 Yaw를 보간 회전.
- 클립 루트 모션이 캐릭터 위치를 밀어내지 않도록 수평 보정(`hipBone` 기준) 적용.
- 야간 밝기 대응으로 emissive intensity를 태양 강도에 따라 보정.

## 5) 애니메이션 클립 매핑 방식

현재는 클립 이름과 실제 동작이 1:1이 아닌 리타게팅/오염 데이터가 있어, alias 매핑 테이블(`CLIP_ACTUAL_MOTION_BY_LABEL`)을 통해 실제 의미를 재해석합니다.

핵심 함수:
- `findClipByAlias(...)`
- `findClip(...)`
- `findClipNameByAlias(...)`
- `findClipNameByPattern(...)`

또한 crouch에 대해서는 `createHorizontalRootLockedClip(...)`으로 X/Z 이동 트랙을 고정한 클립을 만들어 사용합니다.

코드 위치:
- `apps/dawnlight/src/game/engine/player-avatar-setup.ts`

## 6) 감정(Emotion) 구성

### A. 사용자 트리거

1. 모바일 UI 감정 버튼
- `EmotionButton` -> `onTriggerEmotion` -> `handleMobileEmotion`
- 동작: `playGreetingForDuration(2000)` + `playSmileExpressionForDuration(2000)`

코드 위치:
- `apps/dawnlight/src/components/virtual-joystick/emotion-button.tsx`
- `apps/dawnlight/src/components/virtual-joystick/virtual-joystick.tsx`
- `apps/dawnlight/src/components/dawnlight.tsx`

2. 채팅 명령
- `/emotion smile`: 스마일 표정만 2초 요청
- `/hello`: 웨이브 + 스마일 2초

코드 위치:
- `apps/dawnlight/src/components/dawnlight-chat.ts`
- `apps/dawnlight/src/hooks/use-chat-commands.ts`

### B. 감정 실행 방식

1. Greeting(웨이브)
- `playGreetingForDuration`이 `wave_for_help_1` alias 또는 `(wave|greet|hello|hand)` 패턴 클립을 찾아 강제 재생합니다.
- 강제 상태는 일정 시간 후 자동 해제되며, 이동/점프/특정 상태 변화 시 중간 해제될 수 있습니다.

2. Smile(표정)
- `playSmileExpressionForDuration`은 smile 텍스처 프리셋을 적용해 얼굴 텍스처를 교체합니다.
- 최초 호출 시 비동기 프리로드 후 적용, 이후는 캐시된 프리셋 재사용.
- 만료 시간이 지나면 기본 텍스처 프리셋으로 자동 복원.
- 현재 구현상 `playSmileExpressionForDuration(...)`는 preload 성공/실패와 무관하게 즉시 `true`를 반환합니다.
- 따라서 채팅의 실패 문구 분기(`/emotion smile` 실패)는 사실상 잘 발생하지 않고, 실제 preload 실패는 콘솔 에러 로그로 확인하는 구조입니다.

3. 랜덤 스마일
- 별도 트리거 없이도 5~15초 간격으로 1초짜리 랜덤 스마일이 자동 발생합니다.

코드 위치:
- `apps/dawnlight/src/game/engine/player-avatar.ts`
- `apps/dawnlight/src/game/engine/player-avatar-behavior.ts`

## 7) 프리뷰(AvatarPreview)에서의 반영

UI 좌상단 아바타 프리뷰도 동일 GLB/애니메이션 GLB를 별도 로딩합니다.

- 런타임 아바타의 현재 클립 이름(`getCurrentClipName`)을 읽어 동일 클립으로 동기화 재생.
- 프리뷰에서도 hip 기반 수평 루트 모션 보정을 적용해 화면 내 위치 드리프트를 줄입니다.

코드 위치:
- `apps/dawnlight/src/components/dawnlight-ui/avatar-preview.tsx`

## 8) 에셋 최적화 파이프라인(참고)

개발 스크립트 `scripts/optimize-gltf-assets.mjs`는 `asset-origin`의 GLB를 `asset-optimized`로 변환합니다.

- glTF Transform CLI(`@gltf-transform/cli`)로 meshopt 압축 적용
- 텍스처 포맷/크기 조정
- **파일명에 `animation` 문자열이 포함된 경우에만** animation pack으로 분류하여 더 공격적인 텍스처 축소 정책 사용

코드 위치:
- `apps/dawnlight/scripts/optimize-gltf-assets.mjs`
