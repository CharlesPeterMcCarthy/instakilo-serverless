import { PostsController } from './posts.controller';

const controller: PostsController = new PostsController();

export const createPostHandler = controller.create;
export const deletePostHandler = controller.delete;
export const updatePostHandler = controller.update;
export const queryPublicPostsHandler = controller.queryPublic;
