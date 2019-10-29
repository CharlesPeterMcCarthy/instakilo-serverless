import { CommentsController } from './comments.controller';

const controller: CommentsController = new CommentsController();

export const addCommentHandler = controller.addComment;
