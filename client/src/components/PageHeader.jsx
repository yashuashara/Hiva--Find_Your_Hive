const PageHeader = ({ title, subtitle, action }) => {
  return (
    <div className="page-header">
      <div className="header-title">
        <h1>{title}</h1>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
};

export default PageHeader;
