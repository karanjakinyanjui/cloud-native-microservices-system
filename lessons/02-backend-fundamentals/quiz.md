# Module 2: Backend Fundamentals Quiz

## Instructions
- Answer all questions
- Passing score: 70% (21/30 correct)
- You can retake the quiz after reviewing the module content

---

## Section 1: Client-Server Architecture (5 questions)

### Question 1
What is the primary role of a client in client-server architecture?

A) Store data permanently
B) Initiate requests and consume responses
C) Process business logic
D) Manage database connections

**Answer**: B

---

### Question 2
Which of the following can act as a client? (Select all that apply)

A) Web browser
B) Mobile application
C) Another microservice
D) All of the above

**Answer**: D

---

### Question 3
What is a key benefit of separating client and server?

A) Increased coupling between components
B) Ability to scale independently
C) Reduced security
D) Single point of failure

**Answer**: B

---

### Question 4
In a microservices architecture, what happens when Service A calls Service B?

A) Service A acts as a server
B) Service B acts as a client
C) Service A acts as a client
D) Neither acts as client or server

**Answer**: C

---

### Question 5
What does "stateless" mean in client-server architecture?

A) The server never stores any data
B) Each request contains all necessary information
C) Clients cannot maintain session data
D) The database is not used

**Answer**: B

---

## Section 2: HTTP Protocol (10 questions)

### Question 6
What does HTTP stand for?

A) High Transfer Text Protocol
B) HyperText Transfer Protocol
C) HyperText Transmission Process
D) High-Level Text Protocol

**Answer**: B

---

### Question 7
What is the default port for HTTP?

A) 22
B) 443
C) 80
D) 8080

**Answer**: C

---

### Question 8
Which HTTP method is idempotent?

A) POST
B) GET
C) PATCH (depending on implementation)
D) All HTTP methods

**Answer**: B

---

### Question 9
What does "idempotent" mean for HTTP methods?

A) The method is fast
B) Multiple identical requests have the same effect as a single request
C) The method doesn't require authentication
D) The method returns the same response every time

**Answer**: B

---

### Question 10
Which part of an HTTP request separates headers from the body?

A) A comma
B) A semicolon
C) An empty line
D) A special character

**Answer**: C

---

### Question 11
What is the purpose of the Host header in HTTP/1.1?

A) Specify the client's hostname
B) Specify the target server hostname
C) Provide authentication credentials
D) Define caching behavior

**Answer**: B

---

### Question 12
Which HTTP header specifies the format of the request body?

A) Accept
B) Content-Type
C) Content-Length
D) Authorization

**Answer**: B

---

### Question 13
What happens in the TCP/IP layer before an HTTP request is sent?

A) HTTP headers are encrypted
B) A TCP connection is established
C) The response is cached
D) Cookies are deleted

**Answer**: B

---

### Question 14
What is the difference between HTTP and HTTPS?

A) HTTPS is faster
B) HTTPS uses encryption (TLS/SSL)
C) HTTPS uses a different request format
D) HTTPS doesn't support POST requests

**Answer**: B

---

### Question 15
Which HTTP version introduced multiplexing?

A) HTTP/1.0
B) HTTP/1.1
C) HTTP/2
D) HTTP/3

**Answer**: C

---

## Section 3: HTTP Methods (8 questions)

### Question 16
Which HTTP method should be used to create a new resource?

A) GET
B) POST
C) PUT
D) DELETE

**Answer**: B

---

### Question 17
What is the difference between PUT and PATCH?

A) PUT is for creating, PATCH is for deleting
B) PUT replaces entire resource, PATCH updates specific fields
C) PUT is idempotent, PATCH is not
D) There is no difference

**Answer**: B

---

### Question 18
Which HTTP method should NOT have a request body?

A) POST
B) PUT
C) PATCH
D) GET

**Answer**: D

---

### Question 19
You want to update only the price of a product. Which method is most appropriate?

A) GET
B) POST
C) PUT
D) PATCH

**Answer**: D

---

### Question 20
Which HTTP method is considered "safe" (doesn't modify server state)?

A) GET
B) POST
C) DELETE
D) PUT

**Answer**: A

---

### Question 21
What does the OPTIONS HTTP method do?

A) Deletes a resource
B) Describes communication options for the target resource
C) Optimizes the request
D) Creates optional fields

**Answer**: B

---

### Question 22
If you call DELETE on the same resource twice, what should happen?

A) First call succeeds, second call fails
B) Both calls succeed (idempotent)
C) Server error occurs
D) The resource is deleted twice

**Answer**: B

---

### Question 23
Which HTTP method would you use to replace an entire user profile?

A) GET
B) POST
C) PUT
D) PATCH

**Answer**: C

---

## Section 4: HTTP Status Codes (7 questions)

### Question 24
What does a 201 status code indicate?

A) Request successful, no content
B) Resource created successfully
C) Moved permanently
D) Bad request

**Answer**: B

---

### Question 25
When should you return a 404 status code?

A) Server error occurred
B) Authentication failed
C) Resource not found
D) Request was successful

**Answer**: C

---

### Question 26
What is the difference between 401 and 403?

A) 401 means not authenticated, 403 means not authorized
B) 401 is client error, 403 is server error
C) They are the same
D) 401 is for GET, 403 is for POST

**Answer**: A

---

### Question 27
Which status code indicates the client is making too many requests?

A) 400
B) 403
C) 429
D) 503

**Answer**: C

---

### Question 28
What does a 500 status code indicate?

A) Client made an error
B) Resource not found
C) Internal server error
D) Successful response

**Answer**: C

---

### Question 29
When should you return 204 No Content?

A) When the resource doesn't exist
B) When the operation succeeded but there's no response body
C) When authentication fails
D) When validation fails

**Answer**: B

---

### Question 30
What does 304 Not Modified mean?

A) The request failed
B) The resource hasn't changed since last request
C) The resource was modified successfully
D) The server is unavailable

**Answer**: B

---

## Answers Key

1. B
2. D
3. B
4. C
5. B
6. B
7. C
8. B
9. B
10. C
11. B
12. B
13. B
14. B
15. C
16. B
17. B
18. D
19. D
20. A
21. B
22. B
23. C
24. B
25. C
26. A
27. C
28. C
29. B
30. B

## Scoring

- 27-30 correct: Excellent! You've mastered the fundamentals.
- 24-26 correct: Great job! Review the questions you missed.
- 21-23 correct: Good! You passed. Review weak areas.
- Below 21: Review the module content and retake the quiz.

## Areas to Review Based on Wrong Answers

- **Questions 1-5**: Review client-server architecture
- **Questions 6-15**: Review HTTP protocol basics
- **Questions 16-23**: Review HTTP methods
- **Questions 24-30**: Review HTTP status codes
