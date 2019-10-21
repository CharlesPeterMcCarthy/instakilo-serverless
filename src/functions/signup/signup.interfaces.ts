export interface SignupPayload {
	auth: CognitoSignupResponse,
	email: string,
	username: string
}

export interface CognitoSignupResponse {
	codeDeliveryDetails: {
		AttributeName: string;
		DeliveryMedium: string;
		Destination: string;
	}

	user: {
		authenticationFlowType: string;

		client: {
			endpoint: string;
			userAgent: string;
		}

		keyPrefix: string;

		pool: {
			advancedSecurityDataCollectionFlag: boolean;

			client: {
				endpoint: string;
				userAgent: string;
			}

			clientId: string;
			userPoolId: string;
		}

		Session: object | string | null;

		signInUserSession: object | string | null;

		userDataKey: string;

		username: string;
	}

	userConfirmed: boolean;

	userSub: string;

}
