export default class Response {

	public static success = (response) => Response.response(200, response);

	public static error = (error) => Response.response(500, error);

	public static authFailed = (error) => Response.response(401, error);

	public static notFound = (error) => Response.response(404, error);

	private static response = (statusCode, obj) => {
		return {
			statusCode,
			body: JSON.stringify(obj, null, 2),
			headers: {
				'Access-Control-Allow-Origin': '*'  // Makes CORS work with AWS API Gateway
			}
		};
	}

}
