import { TokensController } from './tokens.controller';

const controller: TokensController = new TokensController();

export const storeLoginTokensHandler = controller.storeLoginTokens;
