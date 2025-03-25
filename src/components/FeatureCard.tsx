import React, { ReactNode } from 'react';

/**
 * Props for the FeatureCard component
 */
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

/**
 * Feature card component to display individual app features
 * @param props - Component props containing icon, title and description
 */
export default function FeatureCard({ icon, title, description }: FeatureCardProps): React.ReactElement {
  return (
    <div className="pt-6">
      <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
        <div className="-mt-6">
          <div>
            <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
              {icon}
            </span>
          </div>
          <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">{title}</h3>
          <p className="mt-5 text-base text-gray-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
} 