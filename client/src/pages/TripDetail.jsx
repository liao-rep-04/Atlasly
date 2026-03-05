import { useParams } from 'react-router-dom';

const TripDetail = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container-page py-8">
        <h1 className="text-3xl font-display font-bold mb-4">
          Trip Detail (Coming Soon)
        </h1>
        <p className="text-neutral-600">Trip ID: {id}</p>
      </div>
    </div>
  );
};

export default TripDetail;
