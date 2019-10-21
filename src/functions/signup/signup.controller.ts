import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { SignupPayload } from './signup.interfaces';
import Response from '../../responses/api.responses';

export class SignUpController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public signUp = async (event) => {
		const data: SignupPayload = JSON.parse(event.body);

		try {
			await this.saveUserDetails(data);
			return Response.success({ success: true });
		} catch (err) {
			return Response.error({ success: false, error: 'Unable to save user details' })
		}
	}

	private saveUserDetails = (data) => {
		const { auth, email, username }: SignupPayload = data;
		const userId: string = auth.userSub;
		const confirmed: boolean = auth.userConfirmed;
		const now: string = new Date().toISOString();

		const params = {
			TableName: 'INS-USERS',
			Item: {
				_id: userId,
				email,
				username,
				confirmed,
				times: {
					signedUpAt: now,
					confirmedAt: confirmed ? now : undefined
				}
			}
		};

		return this.dynamo.put(params).promise();
	}

}
