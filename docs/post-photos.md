# 오슬로 글에 사진 넣기

한국어·영어·일본어판 `svalbard_3`은 사진 폴더 하나를 공유한다. 이 저장소에서 처음 작업하는 Mac은 한 번 `git config --local core.hooksPath .githooks`로 사진 발행 훅을 켠다.

1. `media/svalbard_3/originals/`에 JPEG 또는 PNG를 넣는다. SDR을 별도로 보정한 HDR JPEG라면 같은 이름의 SDR 파일을 `originals/sdr/`에 넣을 수 있다.
2. 원하는 언어의 MDX에 `<PostPhoto src="oslo-harbor.jpg" alt="오슬로 항구의 배" />`를 넣는다. 두 칸짜리 `figure` 안에서는 `half`를 추가한다. `pnpm dev`는 로컬 원본을 바로 보여 준다.
3. 글을 평소처럼 `git add`, `git commit`, `git push`한다. 커밋 훅이 발행할 글이 참조한 사진 목록을 만든다. 배포 브랜치로 푸시할 때 해당 원본을 비공개 R2에 보관하고, Actions가 공개 파일을 완성한 뒤 사이트를 배포한다. 중간에 실패하면 같은 커밋으로 재시도할 수 있다.

원본만 교체할 때는 `pnpm media:prepare`를 실행하고 변경된 `media/svalbard_3/manifest.json`을 커밋한다. 새 컴퓨터에서 `pnpm media:restore`를 실행하면 발행한 원본과 SDR 파일을 SHA-256으로 검증해 복원한다. 작업 중인 다른 내용의 파일이 같은 자리에 있으면 중단한다.

## 저장과 화질

원본은 `yongseok-blog-originals`에, 공개 이미지는 `yongseok-me`의 콘텐츠 해시 경로에 저장한다. 원본 폴더는 Git이 무시한다. 이전 오슬로 사진의 공개 주소 13개는 공개 R2 사본으로 연결된다. 마이그레이션 전 공개 Git 이력에는 당시 원본이 남아 있다. 일반 `pnpm build`는 커밋된 사진 목록으로 동작한다. 이미지 발행은 ExifTool과 저장소에 고정된 Sharp를 사용한다. 로컬 발행을 직접 실행할 때는 `brew install exiftool`로 설치할 수 있다.

본문은 사진의 실제 너비 안에서 480·960·1600px WebP 중 하나를 불러온다. JPEG는 품질 92와 색 프로필을 사용하고 PNG는 리사이즈한 각 해상도에서 무손실로 인코딩한다. 확대용 파일에는 원래 해상도를 유지하면서 GPS를 제거한다. 별도 SDR판이 있으면 HDR 화면에서는 기본 JPEG의 게인맵을, SDR 화면에서는 별도 SDR판을 사용한다. 파일 내용이나 변환 규칙이 달라지면 새 주소가 생기고, 기존 주소는 그대로 유효하다.

GitHub Actions와 이 Mac의 키체인은 두 버킷의 객체 읽기·쓰기에 한정한 S3 자격증명을 사용한다. 다른 발행 환경에서는 같은 권한을 주고 `BLOG_MEDIA_R2_S3` 환경 변수에 `accessKeyId`와 `secretAccessKey`를 가진 JSON을 제공한다. 버킷·도메인 설정은 발행 과정에서 변경하지 않는다.
