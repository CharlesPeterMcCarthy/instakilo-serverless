import CognitoPayload from '../../interfaces/cognito-trigger-payload';

export interface LoginPayload extends CognitoPayload { // trigger = 'PostAuthentication_Authentication'
	request: {
		userAttributes: {
			sub: string,
			'cognito:user_status': 'UNCONFIRMED' | 'CONFIRMED',
			email_verified: string | boolean,
			email: string,
			newDeviceUsed: boolean
		}
	},
	response: {	}
}
