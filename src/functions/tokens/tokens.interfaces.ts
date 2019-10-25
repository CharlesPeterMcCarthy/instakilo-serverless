export interface CognitoLoginPayload {
	attributes: {
		email?: string;
		email_verified?: boolean;
		phone_number?: string;
		phone_number_verified?: boolean;
		sub: string;
	}

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

	preferredMFA: string;

	Session: object | string | null;

	signInUserSession: {
		accessToken: {
			jwtToken: string;

			payload: {
				auth_time: number;
				client_id: string;
				event_id: string;
				exp: number;
				iat: number;
				iss: string;
				jti: string;
				scope: string;
				sub: string;
				token_user: string;
				username: string;
			}
		}

		clockDrift: number;

		idToken: {
			jwtToken: string;

			payload: {
				aud: string;
				auth_time: number;
				'cognito:username': string;
				email: string;
				email_verified: boolean;
				event_id: string;
				exp: number;
				iat: number;
				iss: string;
				sub: string;
				token_user: string;
			}
		}

		refreshToken: {
			token: string;
		}
	}

	userDataKey: string;

	username: string;

}
