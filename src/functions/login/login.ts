import { LoginController } from './login.controller';

const controller: LoginController = new LoginController();

export const loginHandler = controller.login;
