import { useState, useCallback } from 'react';

export function useAsync(asyncFn = null, immediate = false) {
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      // Check if the argument passed is a function itself. 
      // If it is, run that. Otherwise, run the default asyncFn.
      const fnToRun = (typeof args[0] === 'function') ? args[0] : asyncFn;
      
      if (!fnToRun) {
        throw new Error("No function provided to useAsync");
      }

      // If they passed a function inline, don't pass the function to itself as an argument
      const argsToPass = (typeof args[0] === 'function') ? args.slice(1) : args;
      
      const result = await fnToRun(...argsToPass);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Something went wrong');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFn]);

  return { loading, error, data, execute };
}