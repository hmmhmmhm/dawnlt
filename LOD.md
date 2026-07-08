# Dawnlight LOD 구성 및 해결 기록

## 1) 목표와 완료 상태
- 목표:
  - 근거리 상호작용(충돌/레이캐스트/블록 조작) 정확성 유지
  - 원거리 가시성 확장
  - 성능 예산 내 비동기 LOD 처리
- 상태:
  - 계획 단계(PLAN.md) 1~7단계 구현 완료
  - 빈구간 이슈(PLAN_FIX.md) 최종 해결 완료

## 2) 현재 LOD 전체 구조
1. 선택(Selection)
   - `lod-tree.ts`, `lod-section.ts`
   - 거리 기반 기대 LOD + 부모 fallback + 섹션 상태머신(`idle -> building -> ready -> active`)
2. 생성(Async Build)
   - `lod-worker-manager.ts`, `lod-worker.ts`
   - 우선순위 큐/백프레셔/버전 무효화(cancel + stale drop)
3. 데이터(Data)
   - 기존: 높이필드 기반 `levels(height/material/color)` + `edgeHeights`
   - 현재: `occupancyLevels(topHeight/bottomHeight)` 추가
4. 렌더(Render)
   - `far-renderer.ts`, `far-renderer-geometry.ts`
   - 전환 품질(페이드/히스테리시스) + 통계(`/lodlog`)
   - 분기: `occupancyLevels` 존재 시 occupancy 경로 우선, 없으면 heightfield fallback
5. 통합(Engine)
   - `lod-runtime.ts`가 worker/renderer/chunk-system을 조정
   - near 상호작용은 near 데이터 기준으로 유지(시각만 far LOD)

## 3) 빈구간 이슈 해결 핵심
- 문제:
  - 경사면/산 사면에서 점형(체커/대각선) 빈구간 지속 발생
- 실패 축:
  - skirt/internal/depth/material/mip/전환 히스테리시스 등 heightfield 미세 튜닝 대부분 효과 없음
- 해결 축:
  - 데이터 소스를 heightfield 중심에서 occupancy voxel 중심으로 전환
- 해결 메커니즘:
  1. worker가 컬럼별 `top/bottom` 볼륨 정보 생성 (`occupancyLevels`)
  2. far renderer가 occupancy 기반으로 top + 노출 side 면 생성
  3. 기존 경로는 fallback으로 유지
- 결과:
  - 사용자 체감 기준으로 빈구간 문제가 해소됨

## 4) 주요 파일(현재 기준)
- 선택/런타임
  - `apps/dawnlight/src/game/engine/lod/lod-runtime.ts`
  - `apps/dawnlight/src/game/engine/lod/lod-tree.ts`
  - `apps/dawnlight/src/game/engine/lod/lod-section.ts`
- 데이터/워커
  - `apps/dawnlight/src/game/engine/lod/lod-data-types.ts`
  - `apps/dawnlight/src/workers/lod-worker.ts`
  - `apps/dawnlight/src/workers/lod-worker-occupancy.ts`
  - `apps/dawnlight/src/workers/lod-worker-manager.ts`
- 렌더
  - `apps/dawnlight/src/game/engine/lod/far-renderer.ts`
  - `apps/dawnlight/src/game/engine/lod/far-renderer-geometry.ts`
  - `apps/dawnlight/src/game/engine/lod/far-renderer-occupancy-geometry.ts`

## 5) 검증 기준
- 타입체크:
  - `pnpm.cmd --filter dawnlight exec tsc --noEmit`
- 핵심 테스트:
  - `pnpm.cmd --filter dawnlight test -- lod-worker.test.ts lod-worker-manager.test.ts lod-tree.test.ts near-only-interaction.test.ts --runInBand`
- 결과:
  - 타입체크/핵심 테스트 통과

## 6) 운영 원칙
- 실험은 한 번에 한 축만 변경
- 체감 동일/악화 시 즉시 원복
- 모든 실험 후 타입체크/핵심 테스트 수행
- 코드 파일 450줄 미만 규칙 유지

## 7) 최근 설계 변경 (로드 순서/경계/색상)
- 배경:
  - `distance`(near)와 `lod distance`(far) 경계에서 로드 순서가 섞이고, 경계 1청크 공백 및 톤 차이가 관찰됨
- 기본값:
  - `/distance` 기본값: `8`
  - `/lod distance` 기본값: `12`
- 선택/적용 규칙 변경:
  1. `distance` 내부 리프는 LOD 후보에서 제외
  2. 섹션 단위는 "distance 내부에 완전히 포함되는 섹션만 제외"로 조정
     - 경계에 걸친 섹션은 허용해서 1청크 공백 방지
  3. `LodTree.selectActiveSections`에 section predicate(`canUseSection`) 주입 지원 추가
- 로드 순서 변경:
  1. 프레임 루프에서 near를 먼저 처리하도록 순서 고정
     - `chunkSystem.updateChunks -> chunkSystem.processLoadQueue -> lodRuntime.tick`
  2. LOD enqueue 게이트 강화
     - `chunkLoadQueue`가 비어 있고,
     - `meshWorker`의 pending/busy/incremental queue가 비어 있고,
     - `distance` 범위 `chunks3D` 데이터가 모두 존재할 때만 LOD 빌드 시작
- 색상/재질 동기화:
  1. LOD 지오메트리에서 과한 어둡기 보정값 완화
     - saturation reduction: `0.16 -> 0.04`
     - top brightness: `0.9 -> 1.0`
     - side brightness: `0.74 -> 0.9`
  2. LOD 컬러 경로의 이중 선형변환 제거
     - `convertSRGBToLinear()` 제거
  3. `FarRenderer`에 낮/밤 재질 응답 추가
     - `sunLight` 기반으로 `roughness/metalness`를 near와 동일 곡선으로 동기화
- 관련 파일:
  - `apps/dawnlight/src/game/engine/animation-loop.ts`
  - `apps/dawnlight/src/game/engine/lod/lod-runtime.ts`
  - `apps/dawnlight/src/game/engine/lod/lod-tree.ts`
  - `apps/dawnlight/src/game/engine/lod/far-renderer.ts`
  - `apps/dawnlight/src/game/engine/lod/far-renderer-geometry.ts`
  - `apps/dawnlight/src/game/engine/lod/far-renderer-occupancy-geometry.ts`
