import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConfirmSignUpPayload } from './confirm-signup.interfaces';

export class ConfirmSignUpController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public confirmSignUp = async (event: ConfirmSignUpPayload) => {
		console.log(event)

		try {
			await this.updateUser(event.request.userAttributes.sub);

			return event;
		} catch (err) {
			return 'Failed to confirm email';
		}
	}

	private updateUser = (userId) => {
		const params = {
			TableName: 'INS-USERS',
			Key: {
				_id: userId
			},
			UpdateExpression: 'SET confirmed = :confirmed, times.confirmed = :now',
			ExpressionAttributeValues: {
				':confirmed': true,
				':now': new Date().toISOString()
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
