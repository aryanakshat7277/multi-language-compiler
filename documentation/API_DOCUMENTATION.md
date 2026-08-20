# API Documentation

## Base URL
`/api/v1`

## Endpoints

### `POST /submissions`
Submit code for execution or evaluation.

**Request Body:**
```json
{
  "type": "EXECUTION", // or "EVALUATION"
  "languageId": "python",
  "files": [
    {
      "name": "main.py",
      "content": "print('Hello World')"
    }
  ],
  "stdin": ""
}
```

**Response:**
```json
{
  "jobId": "uuid-string",
  "status": "QUEUED"
}
```

### `GET /submissions/:jobId`
Get the status and results of a submission.

**Response:**
```json
{
  "jobId": "uuid-string",
  "status": "COMPLETED",
  "result": {
    "stdout": "Hello World\n",
    "stderr": "",
    "exitCode": 0,
    "executionTimeMs": 42
  }
}
```

### `GET /languages`
List supported languages.

**Response:**
```json
[
  {
    "id": "python",
    "displayName": "Python 3",
    "extension": ".py"
  }
]
```

## Error Responses
```json
{
  "error": "Validation Error",
  "message": "Invalid languageId provided"
}
```
