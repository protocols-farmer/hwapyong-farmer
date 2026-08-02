//src/components/pages/posts/computer/ComputerDetails.tsx
import PostDetails from "../PostDetails";

interface ComputerDetailsProps {
  postId: string;
}
function ComputerDetails({ postId }: ComputerDetailsProps) {
  return (
    <div>
      <PostDetails postId={postId} />
    </div>
  );
}
export default ComputerDetails;
