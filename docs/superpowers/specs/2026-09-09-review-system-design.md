# Review System Design

## Summary
Via Busan 자체 평점/리뷰 시스템. 메신저 챗봇 사용자가 토큰 링크를 통해 웹에서 리뷰(별점 + 텍스트 + 사진)를 작성. 웹 직접 방문자는 리뷰 열람만 가능하며, 작성 시 메신저로 유도.

## Auth: Token Link
- 챗봇이 관광지 정보 응답 시 리뷰 토큰 URL 발급
- 토큰: crypto random 64자, 48시간 만료, 1회 사용
- 웹 자체 로그인 불필요

## DB Schema
- `review_tokens`: token, user_id, spot_id, expires_at, used_at
- `reviews`: spot_id, user_id, token_id, rating(1-5), comment, images(jsonb), status
- UNIQUE(spot_id, user_id): 장소당 사용자 1리뷰

## API
- POST /api/review-tokens (봇 내부)
- GET /api/review-tokens/[token] (토큰 검증)
- POST /api/reviews (리뷰 제출)
- GET /api/reviews?spotId=xxx (목록)
- POST /api/upload (사진 → Vercel Blob)
- PATCH /api/reviews/[id] (관리자 숨김)

## Photo Storage
- Vercel Blob (@vercel/blob)

## Components
- StarRating, ReviewForm, ReviewList, ReviewCard, ImageUpload

## Pages
- /[lang]/review/[token] (리뷰 작성)
- spots/[id] 수정 (리뷰 목록 + 평균 평점)
- /admin/reviews (관리자 모더레이션)
