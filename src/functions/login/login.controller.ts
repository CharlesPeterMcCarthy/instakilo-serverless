import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { LoginPayload } from './login.interfaces';

export class LoginController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public login = async (event: LoginPayload) => { // Used by Cognito only
		try {
			await this.updateUser(event.request.userAttributes.sub);

			return event;
		} catch (err) {
			return 'Unable to update login times';
		}
	}

	private updateUser = (userId) => {
		const params = {
			TableName: 'INS-USERS',
			Key: {
				_id: userId
			},
			UpdateExpression: 'set times.lastLogin = :now',
			ExpressionAttributeValues: {
				':now': new Date().toISOString()
			},
			ReturnValues: 'ALL_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
