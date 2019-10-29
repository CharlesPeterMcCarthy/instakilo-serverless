import { CommentsController } from './comments.controller';

const controller: CommentsController = new CommentsController();

export const addCommentHandler = controller.add;
export const deleteCommentHandler = controller.delete;
