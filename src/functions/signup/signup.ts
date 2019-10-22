import { SignUpController } from './signup.controller';

const controller: SignUpController = new SignUpController();

export const signUpHandler = controller.signUp;
export const signUpChecksHandler = controller.signUpChecks;
