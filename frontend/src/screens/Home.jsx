import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/user.context";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { user } = useContext(UserContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState(null);
  const [project, setProject] = useState([]);

  const navigate = useNavigate();

  function createProject(e) {
    e.preventDefault();
    console.log({ projectName });

    axios
      .post("/projects/create", {
        name: projectName,
      })
      .then((res) => {
        console.log(res);
        setIsModalOpen(false);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  useEffect(() => {
    axios
      .get("/projects/all")
      .then((res) => {
        setProject(res.data.projects);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <main className="p-4 text-white bg-gray-800">
      <div className="flex flex-wrap gap-3 projects">
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-4 bg-gray-700 border border-gray-600 rounded-md project hover:bg-gray-600"
        >
          New Project
          <i className="ml-2 ri-link"></i>
        </button>

        {project.map((project) => (
          <div
            key={project._id}
            onClick={() => {
              navigate(`/project`, {
                state: { project },
              });
            }}
            className="flex flex-col gap-2 p-4 bg-gray-700 border border-gray-600 rounded-md cursor-pointer project min-w-52 hover:bg-gray-600"
          >
            <h2 className="font-semibold">{project.name}</h2>

            <div className="flex gap-2">
              <p>
                {" "}
                <small>
                  {" "}
                  <i className="ri-user-line"></i> Collaborators
                </small>{" "}
                :
              </p>
              {project.users.length}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-1/3 p-6 bg-gray-700 rounded-md shadow-md">
            <h2 className="mb-4 text-xl text-white">Create New Project</h2>
            <form onSubmit={createProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300">
                  Project Name
                </label>
                <input
                  onChange={(e) => setProjectName(e.target.value)}
                  value={projectName}
                  type="text"
                  className="block w-full p-2 mt-1 text-white bg-gray-600 border border-gray-500 rounded-md"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 mr-2 text-white bg-gray-600 rounded-md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-500 rounded-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
