import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { SignUpPayload, SignUpChecksPayload } from './signup.interfaces';

export class SignUpController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public signUpChecks = async (event: SignUpChecksPayload) => { // Used by Cognito only
		return event; // Temporary - Replace with username & email checks
	}

	public signUp = async (event: SignUpPayload) => { // Used by Cognito only
		console.log(event);
		try {
			await this.saveUser(event);
			event = this.setCustomMessage(event);

			return event;
		} catch (err) {
			return 'Unable to save user details';
		}
	}

	private saveUser = (event: SignUpPayload) => {
		const attrs = event.request.userAttributes;
		const { sub, email, email_verified, birthdate } = attrs;
		const firstName = attrs[ 'custom:firstname' ];
		const lastName = attrs[ 'custom:lastname' ];
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
				firstName,
				lastName,
				dob: birthdate,
				times: {
					signedUpAt: now
				},
				posts: []
			}
		};

		return this.dynamo.put(params).promise();
	}

	private setCustomMessage = (event: SignUpPayload): SignUpPayload => {
		const req = event.request;

		event.response.emailSubject = 'Welcome to InstaKilo';
		event.response.emailMessage =
			`Hi ${req.userAttributes['custom:firstname']}, 
			Welcome to InstaKilo!<br><br>
			Thanks for signing up.<br><br>
			Use this link to confirm your account: 
			<a href="http://localhost:4200/confirm/${event.userName}/${req.codeParameter}">Confirm</a><br>
			Or use the confirmation code: ${req.codeParameter}<br><br>
			- InstaKilo`;

		return event;
	}

}
