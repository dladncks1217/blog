---
title: "JWT를 이용한 토큰 인증 방식 구현하기(React + Express)"
category: "FE+BE"
date: "2023-08-06 21:34:00 +09:00"
desc: "Authorization Code Flow로 JWT 인증을 간단하게 구현해보자."
thumbnail: "./images/fe+be/token-auth/3.png"
alt: "JWT를 이용한 토큰 인증 방식 구현하기"
---

JWT를 이용하여 토큰 인증 방식을 구현하는 글을 작성해보려 한다.
먼저, 토큰 방식을 왜 쓰는지부터 알아보자.

### 1. 토큰 기반의 인증을 사용하는 이유?

이를 이해하기 위해서는, 세션 기반의 인증 방식이 어떻게 이루어지는지에 대해 알아야 한다.
세션 기반의 인증 방식의 단점을 보완하고자 생긴 방식이 토큰 기반 인증 방식이기 때문이다.
물론 세션 기반 인증 방식의 단점을 보완하고자 토큰 방식이 생겼다고, 토큰 방식이 세션 방식보다 좋다는 이야기는 절대 아니다.
각각 장단점이 존재하며, 프로젝트의 규모나 특성에 따라 방식은 정해가면 되지 않을까 싶다.

아래는 세션 기반의 인증 방식을 정리한 그림이다.

<img src="./images/fe+be/token-auth/1.png" alt="1.png"/> 
<i>세션 기반 인증 방식</i>
<br/><br/>

위와 같이 클라이언트가 로그인 요청을 보내면, 로그인된 사용자들에 대한 정보들을 백엔드 내의 세션 스토리지에서 유지하고 있는 형식이다.

이렇게 되면 백엔드에서는 어떤 사용자들이 로그인되어있는지 확인하기 쉽고, 사용자에 대한 데이터가 클라이언트의 변조에 영향을 받기 어렵다는 장점이 존재한다. 그러나, 이렇게 세션을 통해 관리되면
이 경우, 세션스토리지 자체가 애초에 백엔드에서 관리하고 있기 때문에 백엔드가 무거워지게 된다는 문제가 있다.

무엇보다 서버를 확장하고자 할 때, 매우 피곤해진다.
서버 한 대 내에 존재하던 세션 스토리지가 여러 대의 서버로 늘어나면서 세션 관리들을 따로 해줘야 하기 떄문이다.

아래와 같이 세션 클러스터링 방법을 이용해 해결할 수도 있고, 아예 redis 서버를 하나 둬서 세션을 통째로 관리하는 방법도 있고 한데, 아무튼 머리아프다.

<img src="./images/fe+be/token-auth/2.png" alt="2.png"/> 
<i>서버 확장 시 세션 클러스터링을 이용한 해결방식(예시)</i>
<br/><br/>

이렇게 피곤한 문제들을 근본적으로 해결하기 위해 만들어진 방식이 바로 토큰 인증 방식이다.
바로 사용자 정보를 백엔드에서 저장하고 있지 않는 것이다! 백엔드는 세션스토리지 그런거 쓸 필요도 없다. 그렇다보니 서버 확장할때 저런 골치아픈 고민들을 안해도 된다. 그냥 프론트 시키면 된다.
그냥 "프론트야 토큰 줄테니깐, 잘 갖고있다가 필요한거 생기면 우리한테 같이 보내라" 하는게 토큰 인증 방식이다.

구조는 아래와 같다.

<img src="./images/fe+be/token-auth/3.png" alt="3.png"/> 
<i>토큰을 이용한 인증 방식</i>
<br/><br/>

먼저 프론트엔드에서 request body에 아이디, 패스워드를 담아 백엔드로 보내면 백엔드는 데이터베이스에서 사용자 정보를 확인하는것까지는 똑같다.
그 이후에 Access Token과 RefreshToken을 클라이언트로 발급해주게 된다.(AccessToken에는 일반적으로 세션 방식과 동일하게 userID정도만 들어간다.) accessToken은 당장 데이터들을 받아오는데 사용하게 되는 토큰이고, refreshToken의 경우 만료된 accessToken을 재발급하는데 사용한다.
여기까지 알 수 있는 내용이 하나 있다. 토큰 방식을 이용하게 되면 Session Storage를 사용하지 않기에 확장에도 좋고 서버 부하도 덜하다는 장점이 있지만, 토큰이 털리면 답이 없다는 사실이다.
따라서 refreshToken의 경우 일반적으로 클라이언트에게 쿠키에 담아 주게 된다. 쿠키에 담게 되면 httpOnly속성을 작성할 수 있기에, javascript로 접근해 토큰을 탈취하거나 변조하기 힘들게 된다. 브라우저에서 자동으로 쿠키도 보내주기에 다른 도메인에서 악성 요청을 보내는 시도도 막을 수 있다. XSS나 CSRF공격에 어느정도는 대응하는 셈이다. (물론 보안 취약점을 완전히 제거하는 건 아니기에, 추가적인 보안 조치가 더 필요할 것이다.)

아무튼, 이런 문제를 해결하고자 refreshToken은 쿠키에 넣어 관리한다는건 알았다. 그럼 accessToken은 어떻게 관리될까?
accessToken의 경우 로컬스토리지에서 관리하도록 했다.
이는 CSRF(Cross Site Request Forgery) 공격 때문인데, 이 공격은 사용자가 의도하지 않은 요청을 보내게 만드는 공격이다.
제어권을 직접 탈취하는 공격은 아니지만, 브라우저가 자동으로 쿠키를 넣어줬는데 access Token이 함깨 들어있다면?

자연스럽게 인증이 뚫려버리는 상황이 될 것이다.
이러한 상황을 그나마 방지할 수 있도록 로컬스토리지에서 자바스크립트 코드로 직접 제어하게 된다.

https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html

이는 실제 OWASP 가이드에도 있는 내용이다.
<img src="./images/fe+be/token-auth/13.png" alt="13.png"/>
<br/>

이를 대비하기 위해 CSRF 토큰을 추가로 관리하기도 하는데, 이는 이 글에서 다루지는 않겠다.

아무튼 이런식으로 쿠키를 받은 뒤 다음에 요청을 보낼 때 클라이언트는 Authorization 헤더에 Bearer 토큰내용 형태로 보내게 된다.
백엔드는 이를 빼와서 토큰 유효성을 검증하는 식이다.

이렇게 통신하다보면 accessToken이 만료될 것이다.
만료가 된다면 아래와 같이 동작한다.

<img src="./images/fe+be/token-auth/4.png" alt="4.png"/> 
<i>accessToken 재발급 받기</i>
<br/><br/>

한 흐름으로 나타내자면 이런 느낌이다.

<img src="./images/fe+be/token-auth/4.png" alt="4.png"/> 
<i>accessToken 재발급 받기(한 흐름)</i>
<br/>
<br/>

우선 클라이언트측에서 accessToken 재발급을 요청해야 한다. 역시나 accessToken과 refreshToken을 포함한다.
백엔드측에서는 accessToken이 만료되었는지 확인해야 한다. 이후 만료된 accessToken을 디코딩 한 뒤 토큰 내 userID를 뽑아와야 한다.
userID를 뽑아오는 이유는 redis에 저장되어있는 refreshToken의 키 값이 userID이기 때문이다. 그렇게 redis의 userID: refreshToken값 의 토큰값과 우리가 보낸 토큰 값이 일치하는지를 비교한다.
만약 일치한다면 accessToken을 디코딩했던 데이터를 기반으로 백엔드는 새로운 accessToken을 발급해준다.
이후 새 accessToken과 refreshToken을 보내주는 방식으로 재발급이 진행된다.

그렇다면 여기까지 진행된 내용을 코드로 한번 구현해보자!

**구현한 코드 전체를 설명하면 글이 너무 장황해질 것 같아 전체 코드는 아래 링크에 올려놨다.**
[https://github.com/dladncks1217/JWT_TokenAuth_Example](https://github.com/dladncks1217/JWT_TokenAuth_Example)

<hr/>

### 2. 프론트엔드 코드 구현 (React)

우선 로그인 기능이 있고 로그인 한 상태에서만 번호를 발급할 수 있는 기능을 가진 코드를 작성했다.

| ![5](./images/fe+be/token-auth/5.png) | ![6](./images/fe+be/token-auth/6.png) |
| ------------------------------------- | ------------------------------------- |

<i> (css? 그런건 없다. ㅋㅋㅋㅋㅋ) </i>

프론트엔드 개발환경은 그냥 CRA+typescript와 tanstack Query, axios를 사용하였다.
전체 코드를 설명할 수 없으니, 코드는 그냥 위에 있는 링크를 보고 핵심적인 부분의 코드만 다루겠다.

먼저, 로그인을 시도했을 경우 백엔드에서 데이터가 아래와 같이 올 예정이라 해보자. (이 구현도 아래에서 다룰 계획이다.)

```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJuaWNrIjoi67mE67CA7J6EIiwiaWF0IjoxNjkxMjk1NjkxLCJleHAiOjE2OTEyOTU4NzF9.jsZt2Sv_OMUHGbEKJzaDSgryTVWHXS1ARuhBScgLhCA"
  }
}
```

<img src="./images/fe+be/token-auth/8.png" alt="8.png"/> 
<br/>

쿠키에 위와 같이 refreshToken이 들어갈 것이다.

일단 axios로 요청을 해야 하니 aaxiosInstance부터 만들어주자.

```ts
// ./src/api/axiosInstance.ts

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})
```

그리고 나중에 useMutation에 담아줄 login함수도 만들어주어야 한다.

```ts
import { END_POINTS } from "../../constants/api"
import { LoginData } from "../../types/types"
import { axiosInstance } from "../axiosInstance"

export const postLogin = async (loginData: LoginData) => {
  const response = await axiosInstance.post(END_POINTS.LOGIN, loginData, {
    withCredentials: true, // 무조건 있어야 함!!
  })

  const loginResult = response.data
  localStorage.setItem("accessToken", loginResult.data.accessToken)

  return loginResult
}
```

위와 같이 만들어준다.

withCredentials가 반드시 있어야 한다.
refreshToken의 경우 백엔드에서 쿠키에 담아서 오는데, 이를 저장해뒀다 브라우저에서 다음 요청을 보낼 때 자동으로 담아주어야 하기 때문이다.
저게 없으면 쿠키를 갖고있지를 못한다.
쿠키는 받는데 흘려버리고, 다음에 accessToken 재발급 시에 백엔드에서 "얘 refreshToken어딨음???" 하는 상황이 발생할 수 있다.

여기까지 해 주었다면, accessToken이 만료됨을 알았을 때 재빠르게 토큰을 재발급 받고 하던 로직을 다시 재요청을 보내도록 하는 로직이 필요하다.

이를 작성해주어야 한다.
이 때 우리는 axios의 interceptors를 이용한다.
그 전에 재발급을 받아오는 함수가 당연히 있어야 할 것이다.
아래와 같이 작성해준다.

```ts
const refreshAccessToken = async () => {
  try {
    const response = await axiosInstance.post(
      END_POINTS.REISSUANCE,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        withCredentials: true, // 필수!!
      },
    )

    const { accessToken } = response.data.data
    localStorage.setItem("accessToken", accessToken)

    return accessToken
  } catch (error) {
    console.error(error)
    throw error
  }
}
```

여기서도 꼭 withCredentials를 넣어주자. 위와 같은 이유이다.
accessToken을 받아온 뒤 loaclStorage에 넣어주는 로직도 작성해주자.

여기까지 작성했다면 이제 인터셉터를 작성해주자.
우리가 위에서 만들었던 axiosInstance에 interceptors를 이어붙인다. 아래와 같이 말이다.

```ts
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    if (
      error.response.status === 401 &&
      !originalRequest._retry &&
      error.response.data.message === "jwt expired"
    ) {
      originalRequest._retry = true

      try {
        const newAccessToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        return axiosInstance(originalRequest)
      } catch (refreshError) {
        throw refreshError
      }
    }

    return Promise.reject(error)
  },
)
```

if부분에 들어가는 조건에 대해서는 그냥 백엔드 명세에 따라 맞추면 된다.
위 경우에서는 상태코드 401에 메시지 "jwt expired"이면서 기존 request가 retry중이 아닐때 동작하도록 작성했다.
위에서 만들었던 refreshAccessToken을 받아오며 코드를 동작시키고, 기존에 하고있던 로직 헤더에 새로운 accessToken을 넣어주며, 인터셉터로 오기 전 요청을 다시 재요청하도록 return axiosInstance(originalRequest);를 해주자.

이 3개만 알면 jwt를 이용한 토큰방식 인증은 무난하게 처리할 수 있다.

로그아웃은 그냥 클라이언트에서 토큰 버리면 된다. (이것 때문에 토큰 방식이 보안상 좋은 방식은 아니다. 토큰을 로컬스토리지에서 지우는거지, 토큰이 유효하지 않게 된 것이 아니기 때문이다.)

(이 때문에 백엔드에서 블랙리스트를 만들어 처리하는방법도 있긴 한데... 그럼 토큰 방식의 이점이 하나 사라지게 된다..^^)

이 외의 상세한 코드는 위에 남겨뒀던 링크의 코드를 확인해보자.

잘 동작하는지는 맨 마지막에 있다!

<hr/>

### 3. 백엔드 코드 구현 (Express)

백엔드는 Express(JavaScript) + Sequelize(Mysql) + Redis 를 이용하여 구현하였다.

유저 테이블을 아래와 같다. 테이블은 저거 하나다. 백엔드도 DB관련 설명은 생략하고 설명할 부분만 설명하겠다.

```
mysql> USE token-base-auth-example;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
mysql> select * from users
    -> ;
+----+-----------+------------------------+--------------------------------------------------------------+-----------+---------------------+---------------------+
| id | name      | email                  | password                                                     | nick      | createdAt           | updatedAt           |
+----+-----------+------------------------+--------------------------------------------------------------+-----------+---------------------+---------------------+
|  1 | 임우찬    | dlaxodud1217@gmail.com | $2b$12$C/7YpqQM9x8/.awRcJhgaexHMj2CQxJsj5p/NjTCqvGcyTvCmfqOm | 비밀임    | 2023-08-05 11:48:31 | 2023-08-05 11:48:31 |
+----+-----------+------------------------+--------------------------------------------------------------+-----------+---------------------+---------------------+
1 row in set (0.00 sec)
```

우선 app.js이다.

```js
app.use(
  cors({
    origin: "http://localhost:3000", // * 쓰면 안되더라..
    credentials: true, // 필수
  }),
)
```

프론트엔드가 쿠키를 받고 브라우저측에서 저장할 수 있게 해야 하는데, 그럼 credentials가 true여야 한다.
그런데 여기서 origin이 "\*"이면 바로 클라이언트측에서 오류가 난다. 오리진을 꼭 설정 해 주어야 한다.

이제 jwt관련 유틸함수부터 만들어주자.
어떻게 만들어지고 어떻게 검증하고 어떻게 refresh해주는지에 관해 작성하는 코드이다.

```js
const redisClient = require("./redis-util")
const { promisify } = require("util")
const jwt = require("jsonwebtoken")
require("dotenv").config()
const secret = process.env.JWT_SECRET

module.exports = {
  sign: user => {
    const payload = {
      id: user.id,
      nick: user.nick,
      role: user.role,
    }

    return jwt.sign(payload, secret, {
      algorithm: "HS256",
      expiresIn: "15m",
    })
  },
  verify: token => {
    let decoded = null
    try {
      decoded = jwt.verify(token, secret)
      return {
        ok: true,
        userId: decoded.id,
        nick: decoded.nick,
        role: decoded.role,
      }
    } catch (err) {
      return {
        ok: false,
        message: err.message,
      }
    }
  },
  refresh: () => {
    return jwt.sign({}, secret, {
      algorithm: "HS256",
      expiresIn: "14d",
    })
  },
  refreshVerify: async (token, userId) => {
    const getAsync = promisify(redisClient.get).bind(redisClient)

    try {
      const data = await getAsync.get(userId)

      if (token === data) {
        try {
          jwt.verify(token, secret)
          return true
        } catch (err) {
          return false
        }
      } else {
        return false
      }
    } catch (err) {
      return false
    }
  },
}
```

필수 로직이라 넣었는데, 별로 설명할 내용은 많지 않다.

expiresIn: "15m", 이 부분이 accessToken 유효기간이 15분이라는 코드이다. 예를 들어 3초로 줄이고싶으면 3s 1시간하고싶다 이럼 1h 그냥 이런식으로 쓰면 된다.

그리고 refreshVerify부분을 보면 redisClient에 접속하는데, 맨 처음 위에서 그렸던 내용 그대로 생각하면 된다.

<img src="./images/fe+be/token-auth/9.png" alt="9.png"/> 
<i>accessToken 재발급 받기</i>
<br/>

그냥 위 그림에서 4번 "key가 userID인 redis 값 가져온 뒤클라이언트에게 받았던 쿠키의 refreshToken값이 같은지 비교" 부분을 위해 존재하는 코드이다.

이제 로그인 라우터를 만들어 주자. 아래와 같이 작성했다. (회원가입 로직은 패스하겠다. 위에 남긴 링크에 작성되어있다.)

```js
const router = require("express").Router()
const bcrypt = require("bcrypt")
const { User } = require("../models")
const redisClient = require("../utils/redis-util")
const jsonwebtoken = require("jsonwebtoken")
const jwt = require("../utils/jwt-util")
const { verify, refreshVerify, sign } = require("../utils/jwt-util")

router.post("/login", async (req, res) => {
  const { email, password } = req.body

  const exUser = await User.findOne({ where: { email } })

  if (exUser) console.log("exUser" + exUser.nick)
  if (exUser) {
    const result = await bcrypt.compare(password, exUser.password)
    if (result) {
      const tokenData = {
        id: exUser.id.toString(),
        nick: exUser.nick,
        name: exUser.name,
      }

      const accessToken = jwt.sign(tokenData)
      const refreshToken = jwt.refresh()

      redisClient.set(tokenData.id.toString(), refreshToken)
      res.cookie("refreshToken", refreshToken, {
        maxAge: 60 * 60 * 24 * 14,
        httpOnly: true,
        sameSite: "none", // 이거 strict하면 origin 다를때 cors * 해줘도 cors 뜸.
        secure: true,
      })

      res.status(200).send({
        ok: true,
        data: {
          accessToken,
        },
      })
    } else {
      res.status(401).send({
        ok: false,
        message: "wrong password",
      })
    }
  } else {
    res.status(401).send({
      ok: false,
      message: "없는 사용자입니다.",
    })
  }
})
```

여기서 설명할 내용은 딱 하나다.

로그인 완료 시 accessToken을 response body에 넣어주는 코드이다.
"redisClient.set(tokenData.id.toString(), refreshToken);" 이 코드가 그 코드이다.
이렇게 되면 아래와 같이 "유저번호" : "refreshToken내용" 와 같은 내용으로 redis에 들어가는 것을 확인할 수 있다.

```
127.0.0.1:6379> keys *
1) "11"
2) "3"
3) "7"
4) "1"
5) "6"
6) "8"
```

```js
res.cookie("refreshToken", refreshToken, {
  maxAge: 60 * 60 * 24 * 14,
  httpOnly: true,
  sameSite: "none",
  secure: true,
})
```

이 부분도 볼 게 하나 있는데, 바로 sameSite부분이다. 이걸 strict로 하면 이거 만약 클라이언트와 origin 다를때 cors \* 해줘도 cors가 뜨게 된다.
그래서 none을 해주는데, 그래도 보안은 신경써주어야 하니 secure는 true로 해주자.

다음은 토큰 재발급 라우터이다. 아래와 같이 작성했다.

```js
router.post("/reissuance", async (req, res) => {
  console.log(req.header.cookie)
  if (req.headers.authorization && req.headers.cookie) {
    const accessToken = req.headers.authorization.split("Bearer ")[1]
    const refreshToken = req.headers.cookie.split("=")[1]

    const authResult = verify(accessToken)

    const decoded = jsonwebtoken.decode(accessToken)

    if (decoded === null) {
      res.status(401).send({
        ok: false,
        message: "No authorized!",
      })
    }

    const refreshResult = await refreshVerify(refreshToken, decoded.id)

    if (authResult.ok === false && authResult.message === "jwt expired") {
      if (refreshResult.ok === false) {
        res.status(401).send({
          ok: false,
          message: "No authorized",
        })
      } else {
        const new_accessToken = sign({
          id: decoded.id,
          nick: decoded.nick,
          name: decoded.name,
        })

        res.status(200).send({
          ok: true,
          data: {
            accessToken: new_accessToken,
            userId: decoded.id,
            nick: decoded.nick,
            name: decoded.name,
          },
        })
      }
    }
  } else {
    res.status(403).send({
      ok: false,
      error: "토큰이 없습니다.",
    })
  }
})
```

accessToken은 req.header에 Authorization Bearer로 들어올테고, refreshToken은 쿠키로 준다 했으니 받은 그대로 처리하면 된다. 위 코드대로 말이다.
그 이후 우리가 만들었던 jwt-util에 있는 refreshVerify를 이용해 로직들을 전개해가면 된다.

다음으로는 이 사용자가 로그인된 사용자인지 계속 확인할 수 있는 미들웨어가 필요하다. 아래와 같이 작성했다.

```js
// ./routes/middleware/authJWT.js

const { verify } = require("../../utils/jwt-util")

const authJWT = (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split("Bearer ")[1]

      const result = verify(token)

      if (result.ok) {
        req.id = result.userId
        req.nick = result.nick
        req.role = result.role
        next()
      } else {
        res.status(401).json({
          ok: false,
          status: 401,
          message: result.message,
        })
      }
    } else {
      res.status(401).send({
        ok: false,
        status: 401,
        message: "Not Logged In",
      })
    }
  } catch (error) {
    console.error(error)
  }
}

module.exports = authJWT
```

로그인 된 사용자는 토큰을 계속해서 함께 보낼테니, 로그인된 사용자만 사용할 수 있는 API에다가 이 미들웨어를 붙여주면 된다.
아래와 같이 말이다.(사용자 정보 가져오는 라우터, 랜덤 숫자 받아오는 라우터)

```js
const authJWT = require("./middlewares/authJWT")

const router = require("express").Router()

router.get("/getuser", authJWT, (req, res, next) => {
  if (req.nick) {
    res.json({ nick: req.nick, name: req.name, userId: req.id })
  }
})

router.get("/getnumber", authJWT, (_, res) => {
  res.json({ number: Math.floor(Math.random() * 10) + 1 })
})

module.exports = router
```

<img src="./images/fe+be/token-auth/10.png" alt="10.png"/> 
<br/>

이제 위 그림과 같은 방식으로 동작할 것이다.

<hr/>

### 4. 잘 동작하는지?

토큰 만료시간을 5초까지 줄인 뒤 제대로 동작하는지 확인해보자.

<img src="./images/fe+be/token-auth/11.gif" alt="11.gif"/> 
<br/>

<img src="./images/fe+be/token-auth/12.png" alt="12.png"/> 
<br/>

중간에 토큰이 만료되어 401이 뜨자 재발급을 받은 뒤 다시 넘버를 받기 시작했다.

아주 잘 동작하는 것을 확인할 수 있다!

#### \* 참고

Spring에서 사용할 경우 만료된 토큰값을 읽어 userId를 가져오려 하는 순간 토큰이 터진다고 한다.
이 경우 redis에 키와 값을 반대로 저장하고, 직접 까보는것이 아닌 토큰 자체를 키 키로 하는 방법으로 사용하기도 한다.

[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fblog.woochan.info%2Fblog%2Fjwt-token-auth%2F&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)
