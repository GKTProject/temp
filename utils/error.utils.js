// errorUtils.js

class NotFoundError extends Error {
    constructor(message) {
      super(message);
      this.name = 'NotFoundError';
      this.statusCode = 404;
    }
  }
  
  class BadRequestError extends Error {
    constructor(message) {
      super(message);
      this.name = 'BadRequestError';
      this.statusCode = 400;
    }
  }
  
  class InternalServerError extends Error {
    constructor(message) {
      super(message);
      this.name = 'InternalServerError';
      this.statusCode = 500;
    }
  }
  
  const errorHandler = (err, req, res, next) => {
    console.error(err); 
  
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
        message: "Something went wrong",
     });
  };
  
  export { NotFoundError, BadRequestError, InternalServerError, errorHandler };
  