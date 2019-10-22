import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { SignUpPayload, SignUpChecksPayload } from './signup.interfaces';

export class SignUpController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public signUpChecks = async (event: SignUpChecksPayload) => {
		return event; // Temporary
	}

	public signUp = async (event: SignUpPayload) => {
		try {
			await this.saveUser(event);
			event = this.setCustomMessage(event);

			return event;
		} catch (err) {
			return 'Unable to save user details';
		}
	}

	private saveUser = (event: SignUpPayload) => {
		const { sub, email, email_verified } = event.request.userAttributes;
		const username = event.userName;
		const confirmed = email_verified === 'true'; // email_verified is sent as a string from Cognito
		const now: string = new Date().toISOString();

		const params = {
			TableName: 'INS-USERS',
			Item: {
				_id: sub,
				username,
				email,
				confirmed,
				times: {
					signedUpAt: now
				}
			}
		};

		return this.dynamo.put(params).promise();
	}

	private setCustomMessage = (event: SignUpPayload): SignUpPayload => {
		event.response.emailSubject = 'Welcome to InstaKilo';
		event.response.emailMessage =
			`Welcome to InstaKilo!\nThanks for signing up.\n\nUse this code to confirm your account: ${event.request.codeParameter}`
		return event;
	}

}
