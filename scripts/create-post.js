#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// 한글을 슬러그로 변환하는 함수
function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

// 현재 날짜를 포맷팅하는 함수
function formatDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  return `${month} ${day} ${year}`;
}

async function createPost() {
  try {
    // 사용자 입력 받기
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: '포스트 제목을 입력하세요:',
        validate: (input) => {
          if (!input.trim()) {
            return '제목을 입력해주세요.';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: '포스트 설명을 입력하세요 (선택사항):',
        default: '',
      },
      {
        type: 'input',
        name: 'categories',
        message: '카테고리를 입력하세요 (쉼표로 구분):',
        default: 'blog',
        filter: (input) => {
          return input.split(',').map(cat => cat.trim()).filter(Boolean);
        },
      },
      {
        type: 'list',
        name: 'language',
        message: '포스트 언어를 선택하세요:',
        choices: [
          { name: '한국어', value: 'ko' },
          { name: 'English', value: 'en' },
        ],
        default: 'ko',
      },
      {
        type: 'input',
        name: 'series',
        message: '시리즈 이름을 입력하세요 (선택사항):',
        default: '',
      },
      {
        type: 'input',
        name: 'filename',
        message: '파일명을 입력하세요 (기본값: 제목 기반):',
        default: (answers) => toSlug(answers.title),
        validate: (input) => {
          if (!input.trim()) {
            return '파일명을 입력해주세요.';
          }
          if (!/^[a-zA-Z0-9가-힣_-]+$/.test(input)) {
            return '파일명은 영문, 숫자, 한글, 언더스코어, 하이픈만 사용 가능합니다.';
          }
          return true;
        },
      },
    ]);

    // 날짜 정보
    const date = formatDate();
    const pubDate = formatDateDisplay();

    // MDX 템플릿 생성
    const mdxContent = `---
title: "${answers.title}"
description: "${answers.description || answers.title}"
author: "Yongseok"
pubDate: "${pubDate}"
date: "${date}"
categories: ${JSON.stringify(answers.categories)}${answers.series ? `\nseries: "${answers.series}"` : ''}
heroImage: "/post/images/${answers.filename}/thumb.png"
---

import YouTube from '@components/YouTube.astro';
import GoogleMap from '@components/GoogleMap.astro';
import LinkPreview from '@components/LinkPreview.astro';

# ${answers.title}

여기에 내용을 작성하세요.

## 섹션 제목

내용...

### 하위 섹션

더 자세한 내용...

\`\`\`javascript
// 코드 예시
console.log('Hello, World!');
\`\`\`

> 인용구 예시

- 리스트 아이템 1
- 리스트 아이템 2
- 리스트 아이템 3

1. 순서 있는 리스트 1
2. 순서 있는 리스트 2
3. 순서 있는 리스트 3

**굵은 글씨** 그리고 *기울임 글씨*

[링크 예시](https://example.com)

![이미지 설명](/post/images/${answers.filename}/image.png)
`;

    // 파일 경로 설정
    const contentDir = answers.language === 'en' 
      ? path.join(rootDir, 'src', 'content', 'blog', 'en')
      : path.join(rootDir, 'src', 'content', 'blog');
    
    const mdxFilePath = path.join(contentDir, `${answers.filename}.mdx`);
    const imageDir = path.join(rootDir, 'public', 'post', 'images', answers.filename);

    // 파일이 이미 존재하는지 확인
    try {
      await fs.access(mdxFilePath);
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `파일 ${answers.filename}.mdx가 이미 존재합니다. 덮어쓰시겠습니까?`,
          default: false,
        },
      ]);
      
      if (!overwrite) {
        console.log('❌ 작업이 취소되었습니다.');
        return;
      }
    } catch {
      // 파일이 존재하지 않음 - 정상적으로 진행
    }

    // 디렉토리 생성 (존재하지 않는 경우)
    await fs.mkdir(contentDir, { recursive: true });
    await fs.mkdir(imageDir, { recursive: true });

    // MDX 파일 생성
    await fs.writeFile(mdxFilePath, mdxContent, 'utf-8');

    // 썸네일 플레이스홀더 생성 (선택사항)
    const placeholderPath = path.join(imageDir, '.gitkeep');
    await fs.writeFile(placeholderPath, '', 'utf-8');

    console.log(`
✅ 포스트가 성공적으로 생성되었습니다!

📝 MDX 파일: ${path.relative(rootDir, mdxFilePath)}
📁 이미지 폴더: ${path.relative(rootDir, imageDir)}

다음 명령어로 개발 서버를 실행하세요:
  yarn dev

포스트 URL: http://localhost:4321/blog/${answers.filename}
`);

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log('\n❌ 작업이 취소되었습니다.');
    } else {
      console.error('❌ 오류가 발생했습니다:', error);
    }
  }
}

// 스크립트 실행
createPost();