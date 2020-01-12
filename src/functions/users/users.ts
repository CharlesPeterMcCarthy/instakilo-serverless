import { UsersController } from './users.controller';

const controller: UsersController = new UsersController();

export const myProfileHandler = controller.getMyProfile;
export const otherProfileHandler = controller.getOtherUserProfile;
export const editProfileHandler = controller.editProfile;
export const updateAvatarHandler = controller.updateAvatar;
