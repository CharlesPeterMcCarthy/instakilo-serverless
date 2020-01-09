import { HashTagsController } from './hashtags.controller';

const controller: HashTagsController = new HashTagsController();

export const getPostsByHashTagHandler = controller.getPosts;
export const getMatchingHashTagsHandler = controller.getMatchingHashTags;
