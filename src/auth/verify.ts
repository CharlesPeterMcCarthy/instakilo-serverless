import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

export default class Auth {

    static verify = async (token) => {
        const jwks = {"keys":[{"alg":"RS256","e":"AQAB","kid":"ZveIzyXrW6vHIPmIGvuw6/sabunKLca4va25tVT0jGg=","kty":"RSA","n":"jmG2NE-DYbkftb5xHS9XVmQ6vXX0z1-hoUSz9BjCWzUxvB3ZQD8UxYy3UnIAFC13mdmgaNJD7DW8K4tWTtQYTi9XixMqwBu7ey1ORGncWN6cCSdWKsnNmvXIXAvUS7d3DaXOMJBAD_owbBW1PEXNaHmqyFHC5jNI2lAp3tbA7Kpall0nJmORx3ZGGsClMHARmTQizrvPsSr_AY9hQWsnKE0XMoB3HTeNeEJdVYyRyPO6ej_dN7TtUxaTn3ZNhrYf5LP4rUX_BSFgQhOX7GjCd2MnqQuBvZjd5Nu1Tz2mCFfyBPGbOyYqN6I7wWrw_TEDG8QIdrBY5cUs_mWjdxsG3Q","use":"sig"},{"alg":"RS256","e":"AQAB","kid":"1p+nC7Dz+DXxs6ylpe+XE3MsMghTXsdr6GeLlEJ+QOY=","kty":"RSA","n":"onUWbPr9xI-kyQiQPFP_Zp-zICvHFYlunVt8foMTZ6zGjyH6P-sP1DB5uXgeSHrj2vlJh8xnsqaKEQbLV6n2Ib8GsMlVfT8J-63v8iKXX-gY6Jga_AX9_yxKkn6RNaSe7l37zTqWVH5W03l_YYm0g4qaCeXyhQspSE7oQJ2NsZWcF85i5UQqDqcsvpHAGXNtTRwjkbhu9IFFs1G22ophdRzsW6lL-lsIFBKlXB_onsmUqIlWXQSElNtIEQ_PGlQbg8ddNC5gyPr9Ai1AAIt1gplJTTv0g-2GDxKCVADhJGnvf64EtC1Tf9t8jJgRjOQZLLlusiV_v1K3eOcavKB2SQ","use":"sig"}]}
        const pems = jwks.keys.map((k: { [key: string]: string }) => ({ kid: k.kid, pem: jwkToPem({ kty: k.kty, n: k.n, e: k.e }) }));
        const decodedJwt = jwt.decode(token, { complete: true });

        if (decodedJwt.payload.iss !== 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_6V0H7YYlb') return { error: true, message: 'Invalid Issuer' };
        if (decodedJwt.payload.token_use !== 'access') return { error: true, message: 'Not an access token' };

        const pem = pems.find(p => p.kid === decodedJwt.header.kid).pem;

        try {
            return jwt.verify(token, pem, { algorithms: ['RS256'] });
        } catch (e) {
            return { error: true, message: e.message };
        }
    }

}
