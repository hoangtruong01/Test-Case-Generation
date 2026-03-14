import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }: any) => {

  const token = localStorage.getItem("admin_token");

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminRoute;