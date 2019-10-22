import CognitoPayload from '../../interfaces/cognito-trigger-payload';

export interface ConfirmSignUpPayload extends CognitoPayload { // trigger = 'PostConfirmation_ConfirmSignUp'
	request: {
		userAttributes: {
			sub: string,
			'cognito:user_status': 'UNCONFIRMED' | 'CONFIRMED',
			email_verified: string | boolean,
			email: string
		},
		validationData: null | object
	},
	response: {	}
}
