# Paper Closet - Worker Variables 구조

이번 버전은 Notion data source ID를 `cloudflare-worker.js`에 하드코딩하지 않습니다.

## 파일

```txt
cloudflare-worker.js  # Cloudflare Worker에 올릴 코드
index.html            # GitHub Pages에 올릴 프론트
README.md             # 설정 안내
wrangler.example.toml # Wrangler를 쓸 때만 참고
```

## Cloudflare Worker Secrets

Cloudflare Worker > Settings > Variables and Secrets 에서 Secret으로 추가합니다.

```txt
NOTION_TOKEN = Notion Internal Integration Secret
APP_TOKEN = index.html에서 Worker 호출할 때 사용할 앱 비밀번호
```

## Cloudflare Worker Variables

Cloudflare Worker > Settings > Variables and Secrets 에서 일반 Variable로 추가합니다.

```txt
NOTION_CLOTHES_DATA_SOURCE_ID = 3746b59b-151a-8025-8c26-000b02cfe5bb
NOTION_OOTD_DATA_SOURCE_ID = 3746b59b-151a-81c4-8e35-000b40fc6517
NOTION_LAUNDRY_DATA_SOURCE_ID = 3746b59b-151a-810d-93c8-000b8bc65ecf
NOTION_VERSION = 2025-09-03
CORS_ORIGIN = https://깃허브아이디.github.io
PUBLIC_MEDIA_BASE_URL = https://워커주소.workers.dev/media
```

`NOTION_VERSION`, `CORS_ORIGIN`, `PUBLIC_MEDIA_BASE_URL`은 선택값입니다.

## R2 이미지 업로드를 쓸 때

Cloudflare Worker > Settings > Bindings에서 R2 bucket binding을 추가합니다.

```txt
Binding name: CLOSET_R2
Bucket name: paper-closet-assets
```

## GitHub Pages

GitHub에는 `index.html`만 올려도 됩니다.

첫 접속 후 우측 상단 ⚙에서 입력합니다.

```txt
Worker API 주소 = https://워커주소.workers.dev
APP_TOKEN = Worker Secret에 넣은 APP_TOKEN
```

여기에는 Notion Token이나 Notion data source ID를 넣지 않습니다.


## PWA 설치형 앱 구성

GitHub Pages에는 아래 파일을 같이 올려야 합니다.

```txt
index.html
manifest.webmanifest
service-worker.js
icons/
```

설치 조건:

- GitHub Pages처럼 HTTPS 주소여야 합니다.
- `manifest.webmanifest`가 `index.html`과 같은 폴더에 있어야 합니다.
- `service-worker.js`도 `index.html`과 같은 폴더에 있어야 합니다.
- 첫 접속 후 한 번 새로고침하면 설치 버튼이 더 안정적으로 뜹니다.

설치 방법:

- Chrome / Edge / Android: 화면 우측 상단 `⇩` 버튼 또는 브라우저의 `앱 설치`
- iPhone Safari: 공유 버튼 → `홈 화면에 추가`

주의:

- PWA는 화면 shell을 캐시하므로 앱 실행은 가능하지만, Notion 데이터 조회/저장에는 인터넷 연결이 필요합니다.
- Cloudflare Worker API와 R2 이미지는 최신 데이터를 위해 service worker에서 별도로 캐시하지 않습니다.


## 2026-06 업데이트

- 옷 카드 클릭 시 상세 보기
- 옷 수정 기능 추가
- 옷 삭제 기능 추가: Worker `DELETE /api/clothes/:id`에서 Notion page를 archived 처리합니다.
- 옷 등록/수정 UI 개선
- 이모지 프리셋 선택 추가
- 색상 칩 선택 추가
- 사진 미리보기 추가

주의: 기존 Cloudflare Worker 코드를 새 `cloudflare-worker.js`로 교체해야 삭제 기능이 동작합니다.


## 2026-06 추가 업데이트

- OOTD 수정 기능 추가: 날짜, 상황, 착용 옷, 착장 사진, 날씨, 만족도, 메모 수정 가능
- OOTD 삭제 기능 추가: Notion page archived 처리
- OOTD 수정/삭제 후 연결된 옷의 착용 횟수, 총 착용 횟수, 최근 착용일, 세탁 필요 상태를 다시 계산
- 색상 칩 동적 확장: 직접 입력한 색상은 저장 후 다음 등록/수정 화면에서 기본 색상 칩과 함께 표시
- 커스텀 색상 일부는 민트/버건디/와인/차콜/크림 등 swatch 색상 자동 표시

주의: 이번 버전은 Worker에 `PATCH /api/ootd/:id`, `DELETE /api/ootd/:id`가 추가되므로 Cloudflare Worker 코드도 반드시 교체해야 합니다.


## v4 Closet 필터 추가

Closet 화면에 다음 기능을 추가했습니다.

```txt
- 종류 필터: 상의/하의/아우터/세탁 필요 등
- 색상 필터: 기본 색상 + 사용자가 추가한 색상 자동 표시
- 날짜 필터: 최근 7일/30일/90일 착용, 아직 안 입은 옷, 최근 30일 세탁, 1년 이내 구매
- 정렬: 최근 수정순, 최근 등록순, 최근 착용순, 오래 안 입은 순, 세탁 필요 먼저, 많이 입은 순, 적게 입은 순, 이름순
```

`최근 등록순`, `최근 수정순`을 정확히 쓰기 위해 `cloudflare-worker.js`의 옷 응답에 `createdTime`, `updatedTime`을 추가했습니다.


## v5 overflow fix

Closet 필터 칩이 화면을 가로로 밀어내는 문제를 수정했습니다. `index.html`과 `service-worker.js`를 같이 교체하세요. PWA 캐시 때문에 앱을 완전히 닫았다가 다시 열거나 브라우저에서 강력 새로고침이 필요할 수 있습니다.


## v6 add button fix

- Closet 상단에 `+ 옷 추가` 버튼을 추가했습니다.
- 하단 플로팅 `+` 버튼이 화면 밖으로 밀리거나 하단 탭 뒤에 가려지지 않도록 위치와 z-index를 수정했습니다.
- PWA service worker 캐시 버전을 업데이트했습니다.


## v7 click-edit-fix

- Closet 카드 클릭 시 상세 창 열림 보강
- Closet 카드의 `수정` 버튼 클릭 시 수정 창 열림 보강
- OOTD 카드의 `수정` 버튼 클릭 이벤트도 동일하게 보강
- PWA 캐시 버전 업데이트


## Service Worker 기능

이번 버전은 `service-worker.js`에 아래 기능이 들어 있습니다.

```txt
- 앱 shell 캐시: index.html, manifest, icon
- 오프라인 실행: 인터넷이 없어도 앱 화면 진입 가능
- GET API 캐시: /api/clothes, /api/ootd, /api/laundry 최근 응답 캐시
- 이미지 캐시: R2 /media 이미지와 일반 이미지 캐시
- 새 버전 감지 후 자동 적용
- 설정 화면에서 앱 캐시 초기화
```

주의: 오프라인 상태에서는 새 옷 저장, OOTD 저장, 사진 업로드처럼 Notion/Worker에 쓰는 작업은 불가능합니다. 캐시된 최근 데이터 조회 중심으로 동작합니다.


## OOTD 입력 필터

이번 버전은 OOTD 기록/수정 화면의 `입은 옷` 영역에 필터가 추가되었습니다.

```txt
- 전체
- 상의
- 하의
- 아우터
- 원피스
- 신발
- 가방
- 액세서리
- 기타
- 선택한 옷
```

옷 이름, 색상, 스타일 검색도 같이 사용할 수 있습니다.
