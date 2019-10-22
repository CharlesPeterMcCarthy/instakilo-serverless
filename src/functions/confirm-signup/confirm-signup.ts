import { ConfirmSignUpController } from './confirm-signup.controller';

const controller: ConfirmSignUpController = new ConfirmSignUpController();

export const confirmSignUpHandler = controller.confirmSignUp;
