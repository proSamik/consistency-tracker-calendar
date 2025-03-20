import { login, signup } from './actions'

/**
 * Login page component with email/password authentication
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex justify-center items-center">
      <form className="w-full max-w-sm p-8 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-600">Login or Sign Up</h1>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email:
          </label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" 
            required 
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password:
          </label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" 
            required 
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none" 
            formAction={login}
          >
            Log in
          </button>
          <button 
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none" 
            formAction={signup}
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  )
} 