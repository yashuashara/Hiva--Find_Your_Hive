const Loader = ({ label = "Loading..." }) => {
  return (
    <div className="loader-container" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true"></div>
      <p className="loader-text">{label}</p>
    </div>
  );
};

export default Loader;
