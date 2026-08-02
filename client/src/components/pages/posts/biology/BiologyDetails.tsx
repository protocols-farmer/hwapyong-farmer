//src/components/pages/posts/biology/BiologyDetails.tsx
import PostDetails from "../PostDetails";

interface BiologyDetailsProps {
  postId: string;
}

function BiologyDetails({ postId }: BiologyDetailsProps) {
  return <PostDetails postId={postId} />;
}

export default BiologyDetails;
