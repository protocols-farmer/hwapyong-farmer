//src/components/pages/posts/diary/DiaryDetails.tsx
import PostDetails from "../PostDetails";

interface DiaryDetailsProps {
  postId: string;
}

function DiaryDetails({ postId }: DiaryDetailsProps) {
  return (
    <div>
      <PostDetails postId={postId} />
    </div>
  );
}

export default DiaryDetails;
