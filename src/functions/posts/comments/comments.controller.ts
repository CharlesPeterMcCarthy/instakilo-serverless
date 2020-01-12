import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Response from '../../../responses/api.responses';
import Auth from '../../../auth/verify';
import { Comment, Post, UserBrief } from '@instakilo/common';
import UserUtils from '../../../user/user';
import uuidv4 from 'uuid/v4';
import ErrorTypes from '../../../responses/error.types';

export class CommentsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public add = async (event) => {
        const data = JSON.parse(event.body);
        const { commentText, postId, token }: { commentText: string, postId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error(ErrorTypes.AUTH_INVALID());

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.error(ErrorTypes.USER_NOT_FOUND());

        try {
            const comment: Comment = this.formatComment(commentText, user);
            await this.saveComment(comment, postId);
            const res = await this.getPostComments(postId);
            const comments = res.Item.comments;

            return Response.success({ comments });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to add comment'));
        }
    }

    public delete = async (event) => {
        const data = JSON.parse(event.body);
        const { postId, commentId, token }: { postId: string, commentId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error(ErrorTypes.AUTH_INVALID());

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.error(ErrorTypes.USER_NOT_FOUND());

        try {
            await this.removeComment(postId, commentId, user._id);
            const res = await this.getPostComments(postId);
            const comments = res.Item.comments;

            return Response.success({ comments });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to delete comment'));
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
            UpdateExpression: 'SET comments = list_append(comments, :c), commentCount = commentCount + :count',
            ExpressionAttributeValues: {
                ':c': [ comment ],
                ':count': 1
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

        if (!post) throw ErrorTypes.POST_NOT_EXISTS();
        if (!post.comments) throw ErrorTypes.ROGUE_COMMENT();

        return post;
    }

    private checkAuthorisedDelete = (post: Post, userId: string, commentId: string) => {
        if (post.createdBy._id === userId || post.comments.find(c => c._id === commentId && c.user._id === userId)) return true;
        throw ErrorTypes.UNAUTH_COMMENT_DELETE();
    }

    private removeComment = async (postId: string, commentId: string, userId: string) => {
        const post: Post = await this.getPost(postId);
        this.checkAuthorisedDelete(post, userId, commentId);

        const commentIndex = await this.getCommentIndex(post.comments, commentId);
        if (commentIndex < 0) throw ErrorTypes.COMMENT_NOT_EXISTS();

        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postId
            },
            UpdateExpression: `REMOVE comments[${commentIndex}] SET commentCount = commentCount + :count`,
            ExpressionAttributeValues: {
                ':count': -1
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

    private getCommentIndex = async (comments: Comment[], commentId: string) => comments.map((c: Comment) => c._id).indexOf(commentId);

    private getPostComments = async (postId: string) => {
        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postId
            },
            ProjectionExpression: 'comments'
        };

        return await this.dynamo.get(params).promise();
    }

}
