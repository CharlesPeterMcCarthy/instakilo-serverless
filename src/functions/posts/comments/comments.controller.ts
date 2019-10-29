import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Response from '../../../responses/api.responses';
import Auth from '../../../auth/verify';
import { Comment, UserBrief } from '@instakilo/common';
import UserUtils from '../../../user/user';

export class CommentsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public addComment = async (event) => {
        const data = JSON.parse(event.body);
        const { commentText, postId, token }: { commentText: string, postId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error({ success: false, error: 'Authentication Invalid' });

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.error({ success: false, error: 'Invalid user' })

        try {
            const comment: Comment = this.formatComment(commentText, user);
            await this.saveComment(comment, postId);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            return Response.error({ success: false, error: 'Unable to add comment' });
        }
    }

    private formatComment = (text: string, user: UserBrief) => {
        return {
            text,
            user,
            datetime: new Date().toISOString()
        }
    }

    private saveComment = (comment: Comment, postId: string) => {
        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postId
            },
            UpdateExpression: 'SET comments = list_append(comments, :c)',
            ExpressionAttributeValues: {
                ':c': [ comment ]
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

}
