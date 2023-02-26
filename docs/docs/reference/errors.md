# Errors

## E0001 AuthError {#E0001}

The client was not authenticated or not authorized to connect or access a doc. The error message will provide more information about what was attempted to be accessed.

## E0002 MessageEncodingError {#E0002}

The client or server could not decode a message it was sent. This is unexpected in normal operation and suggests a mismatch between the protocol versions between the client and server. Make sure your `firesync-client` library is upgraded to the latest version, and `firesync-server` if you are self-hosting.

## E0003 BadRequestError {#E0003}

The client or server got a message with unexpected content. This is unexpected in normal operation and suggests a mismatch between the protocol versions between the client and server. Make sure your `firesync-client` library is upgraded to the latest version, and `firesync-server` if you are self-hosting.

## E0004 UnexpectedInternalStateError {#E0004}

Something unexpected happened in the internals of Firesync. This is probably a bug if you're seeing it. Please open an issue with the error message and the steps needed to reproduce the error.

## E0005 BadParameterError {#E0005}

A function or behaviour was called with unexpected inputs. The error message should provide more details. Please check that you are passing in the expected inputs. If you believe this is happening in firesync internals then this may be a bug. If so, please open an issue with the error message and the steps needed to reproduce the error.
