import CognitoPayload from "../../interfaces/cognito-trigger-payload";

export interface SignUpChecksPayload extends CognitoPayload { // trigger = 'PreSignUp_SignUp'
	request: {
		userAttributes: {
			email: string
		},
		validationData: null | object
	},
	response: {
		autoConfirmUser: boolean,
		autoVerifyEmail: boolean,
		autoVerifyPhone: boolean
	}
}

export interface SignUpPayload extends CognitoPayload { // trigger = 'CustomMessage_SignUp'
	request: {
		userAttributes: {
			sub: string,
			'cognito:user_status': 'UNCONFIRMED' | 'CONFIRMED',
			email_verified: string | boolean,
			email: string,
			birthdate: string,
			'custom:firstname': string,
			'custom:lastname': string
		},
		codeParameter: string, // {####}
		linkParameter: string, // {##Click Here##}
		usernameParameter: null | string
	},
	response: {
		smsMessage: null | string,
		emailMessage: null | string,
		emailSubject: null | string
	}
}
