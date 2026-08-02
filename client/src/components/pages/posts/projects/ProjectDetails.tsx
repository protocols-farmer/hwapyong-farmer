//src/components/pages/posts/projects/ProjectDetails.tsx
import PostDetails from "../PostDetails";

interface ProjectDetailsProps {
  postId: string;
}

function ProjectDetails({ postId }: ProjectDetailsProps) {
  return (
    <div>
      <PostDetails postId={postId} />
    </div>
  );
}
export default ProjectDetails;
