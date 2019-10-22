interface CognitoPayload {
	version: string | number,
	region: string, // eu-west-1
	userPoolId: string,
	userName: string,
	callerContext: {
		awsSdkVersion: string,
		clientId: string
	},
	triggerSource: string,
	request: any,
	response: any
}

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
			email: string
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
