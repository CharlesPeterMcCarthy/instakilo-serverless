import { PostsController } from './posts.controller';

const controller: PostsController = new PostsController();

export const createPostHandler = controller.create;
export const deletePostHandler = controller.delete;
