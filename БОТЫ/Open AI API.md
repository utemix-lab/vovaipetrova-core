

Регистрация через Google account: moralitedmitry@gmail.com
Имя: Dmitri Utemov
Добавил omvorkspro@gmail.com в команду.
API key name: Admin Key
Project name: Vova_i_Petrova

**Make your first API call**
Create a project and generate a key to make your first API call.

My test key:

```
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
```


Try out your new API key
## curl:
Run this curl command in a terminal to generate a haiku for free using the gpt-4o-mini model:

```
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{
    "model": "gpt-4o-mini",
    "store": true,
    "messages": [
      {"role": "user", "content": "write a haiku about ai"}
    ]
  }'
```

## Node:
Install the OpenAI Node SDK and execute the code below to generate a haiku for free using the gpt-4o-mini model:

```
npm install openai
```

```
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
});

const completion = openai.chat.completions.create({
  model: "gpt-4o-mini",
  store: true,
  messages: [
    {"role": "user", "content": "write a haiku about ai"},
  ],
});

completion.then((result) => console.log(result.choices[0].message));
```

## Python
Install the OpenAI Python SDK and execute the code below to generate a haiku for free using the gpt-4o-mini model:

```
pip install openai
```

```
from openai import OpenAI

client = OpenAI(
  api_key="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"
)

completion = client.chat.completions.create(
  model="gpt-4o-mini",
  store=True,
  messages=[
    {"role": "user", "content": "write a haiku about ai"}
  ]
)

print(completion.choices[0].message);

```
