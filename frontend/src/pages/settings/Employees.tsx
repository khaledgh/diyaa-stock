import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * @deprecated This page has been merged with the Users page.
 * Employee data is now managed through the Users interface.
 * This component redirects to /users after 3 seconds.
 */
export default function Employees() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/users');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4">
              <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Employees Page Moved
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Employee management has been merged with the Users page
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                What's Changed?
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Employee data is now part of the Users table</li>
                <li>All employee fields (phone, position, salary) are available in Users</li>
                <li>Van assignments can be managed directly from Users</li>
                <li>One unified interface for all personnel management</li>
              </ul>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You will be automatically redirected to the Users page in 3 seconds...
            </p>
            <Button 
              onClick={() => navigate('/users')} 
              className="w-full sm:w-auto"
              size="lg"
            >
              Go to Users Page Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
