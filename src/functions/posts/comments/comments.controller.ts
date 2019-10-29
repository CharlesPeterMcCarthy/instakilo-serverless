import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Response from '../../../responses/api.responses';
import Auth from '../../../auth/verify';
import {Comment, Post, UserBrief} from '@instakilo/common';
import UserUtils from '../../../user/user';
import uuidv4 from 'uuid/v4';

export class CommentsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public add = async (event) => {
        const data = JSON.parse(event.body);
        const { commentText, postId, token }: { commentText: string, postId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error({ code: 'auth-invalid', message: 'Authentication Invalid', custom: true });

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.error({ code: 'invalid-user', message: 'User does not exist', custom: true });

        try {
            const comment: Comment = this.formatComment(commentText, user);
            await this.saveComment(comment, postId);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            return Response.error({ code: 'unknown-error', message: 'Unable to add comment', custom: true });
        }
    }

    public delete = async (event) => {
        const data = JSON.parse(event.body);
        const { postId, commentId, token }: { postId: string, commentId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error({ success: false, error: 'Authentication Invalid' });

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.error({ success: false, error: 'Invalid user' });

        try {
            await this.removeComment(postId, commentId, user._id);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error({ code: 'unknown-error', message: 'Unable to delete comment', custom: true });
        }

    }

    private formatComment = (text: string, user: UserBrief) => {
        return {
            _id: uuidv4(),
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

    private getPost = async (postId: string) => {
        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postId
            }
        };

        const res = await this.dynamo.get(params).promise();
        const post: Post = res.Item as Post;

        if (!post) throw { code: 'post-does-not-exist', message: 'The post does not exist', custom: true };
        if (!post.comments) throw { code: 'comment-not-from-post', message: 'The comment being deleted does not belong to this post', custom: true };

        return post;
    }

    private checkAuthorisedDelete = (post: Post, userId: string, commentId: string) => {
        if (post.createdBy._id === userId || post.comments.find(c => c._id === commentId && c.user._id === userId)) return true;
        throw { code: 'unauthorised-comment-delete', message: 'You are not allowed to delete this comment', custom: true };
    }

    private removeComment = async (postId: string, commentId: string, userId: string) => {
        const post: Post = await this.getPost(postId);
        this.checkAuthorisedDelete(post, userId, commentId);

        const commentIndex = await this.getCommentIndex(post.comments, commentId);
        if (commentIndex < 0) throw { code: 'comment-does-not-exist', message: 'The comment does not exist', custom: true };

        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postId
            },
            UpdateExpression: `REMOVE comments[${commentIndex}]`,
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

    private getCommentIndex = async (comments: Comment[], commentId: string) => comments.map((c: Comment) => c._id).indexOf(commentId);

}
