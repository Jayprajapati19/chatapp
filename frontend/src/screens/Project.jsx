import React, { useState, useEffect, useContext, useRef } from "react";
import { UserContext } from "../context/user.context";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../config/axios";

import {
  initializeSocket,
  receiveMessage,
  sendMessage,
} from "../config/socket";

import Markdown from "markdown-to-jsx";

import hljs from "highlight.js";

import { getWebContainer } from "../config/webcontainer";

function SyntaxHighlightedCode(props) {
  const ref = useRef(null);

  React.useEffect(() => {
    if (ref.current && props.className?.includes("lang-") && window.hljs) {
      window.hljs.highlightElement(ref.current);

      ref.current.removeAttribute("data-highlighted");
    }
  }, [props.className, props.children]);

  return <code {...props} ref={ref} />;
}

const Project = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(new Set()); // Initialized as Set
  const [project, setProject] = useState(location.state.project);
  const [message, setMessage] = useState("");
  const { user } = useContext(UserContext);
  const messageBox = React.createRef();

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [fileTree, setFileTree] = useState({});

  const [currentFile, setCurrentFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);

  const [webContainer, setWebContainer] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);

  const [runProcess, setRunProcess] = useState(null);

  const handleUserClick = (id) => {
    setSelectedUserId((prevSelectedUserId) => {
      const newSelectedUserId = new Set(prevSelectedUserId);
      if (newSelectedUserId.has(id)) {
        newSelectedUserId.delete(id);
      } else {
        newSelectedUserId.add(id);
      }

      return newSelectedUserId;
    });
  };

  function addCollaborators() {
    axios
      .put("/projects/add-user", {
        projectId: location.state.project._id,
        users: Array.from(selectedUserId),
      })
      .then((res) => {
        console.log(res.data);
        setIsModalOpen(false);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  const send = () => {
    sendMessage("project-message", {
      message,
      sender: user,
    });
    setMessages((prevMessages) => [...prevMessages, { sender: user, message }]); // Update messages state
    setMessage("");
  };

  function WriteAiMessage(message) {
    const messageObject = JSON.parse(message);

    return (
      <div className="p-2 overflow-auto text-white rounded-sm bg-slate-950">
        <Markdown
          children={messageObject.text}
          options={{
            overrides: {
              code: SyntaxHighlightedCode,
            },
          }}
        />
      </div>
    );
  }

  useEffect(() => {
    initializeSocket(project._id);

    if (!webContainer) {
      getWebContainer().then((container) => {
        setWebContainer(container);
        console.log("container started");
      });
    }

    receiveMessage("project-message", (data) => {
      console.log(data);

      if (data.sender._id == "ai") {
        const message = JSON.parse(data.message);

        console.log(message);

        webContainer?.mount(message.fileTree);

        if (message.fileTree) {
          setFileTree(message.fileTree || {});
        }
        setMessages((prevMessages) => [...prevMessages, data]); // Update messages state
      } else {
        setMessages((prevMessages) => [...prevMessages, data]); // Update messages state
      }
    });

    axios
      .get(`/projects/get-project/${location.state.project._id}`)
      .then((res) => {
        console.log(res.data.project);

        setProject(res.data.project);
        setFileTree(res.data.project.fileTree || {});
      });

    axios
      .get("/users/all")
      .then((res) => {
        setUsers(res.data.users);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  function saveFileTree(ft) {
    axios
      .put("/projects/update-file-tree", {
        projectId: project._id,
        fileTree: ft,
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  const deleteProject = () => {
    axios
      .delete(`/projects/delete/${project._id}`)
      .then((res) => {
        console.log(res.data);
        navigate("/");
      })
      .catch((err) => {
        console.log(err);
      });
  };

  // Removed appendIncomingMessage and appendOutgoingMessage functions

  function scrollToBottom() {
    messageBox.current.scrollTop = messageBox.current.scrollHeight;
  }

  return (
    <main className="flex w-screen h-screen">
      <section className="relative flex flex-col h-screen bg-gray-800 left min-w-96">
        <header className="absolute top-0 z-10 flex items-center justify-between w-full p-2 px-4 bg-gray-700">
          <button className="flex gap-2" onClick={() => setIsModalOpen(true)}>
            <i className="mr-1 ri-add-fill"></i>

            <p>Add collaborator</p>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              className="p-2"
            >
              <i className="ri-group-fill"></i>
            </button>
            <button onClick={deleteProject} className="p-2">
              <i className="ri-delete-bin-line"></i>
            </button>
          </div>
        </header>
        <div className="relative flex flex-col flex-grow h-full pb-10 conversation-area pt-14">
          <div
            ref={messageBox}
            className="flex flex-col flex-grow max-h-full gap-1 p-1 overflow-auto message-box scrollbar-hide"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.sender._id === "ai" ? "max-w-80" : "max-w-52"
                } ${
                  msg.sender._id == user._id.toString() && "ml-auto"
                }  message flex flex-col p-2 bg-gray-600 w-fit rounded-md`}
              >
                <small className="text-xs text-gray-300 opacity-65">
                  {msg.sender.email}
                </small>
                <div className="text-sm">
                  {msg.sender._id === "ai" ? (
                    WriteAiMessage(msg.message)
                  ) : (
                    <p>{msg.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 flex w-full inputField">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-grow p-2 px-4 text-white bg-gray-700 border-none outline-none"
              type="text"
              placeholder="Enter message"
            />
            <button onClick={send} className="px-5 text-white bg-blue-500">
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
        </div>
        <div
          className={`sidePanel w-full h-full flex flex-col gap-2 bg-gray-700 absolute transition-all ${
            isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
          } top-0`}
        >
          <header className="flex items-center justify-between p-2 px-4 bg-gray-600">
            <h1 className="text-lg font-semibold text-white">Collaborators</h1>

            <button
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              className="p-2"
            >
              <i className="text-white ri-close-fill"></i>
            </button>
          </header>
          <div className="flex flex-col gap-2 users">
            {project.users &&
              project.users.map((user) => {
                return (
                  <div className="flex items-center gap-2 p-2 cursor-pointer user hover:bg-gray-600">
                    <div className="flex items-center justify-center p-5 text-white bg-gray-500 rounded-full aspect-square w-fit h-fit">
                      <i className="absolute ri-user-fill"></i>
                    </div>
                    <h1 className="text-lg font-semibold text-white">
                      {user.email}
                    </h1>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      <section className="flex flex-grow h-full bg-gray-800 right">
        <div className="h-full bg-gray-700 explorer max-w-64 min-w-52">
          <div className="w-full file-tree">
            {Object.keys(fileTree).map((file, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentFile(file);
                  setOpenFiles([...new Set([...openFiles, file])]);
                }}
                className="flex items-center w-full gap-2 p-2 px-4 bg-gray-600 cursor-pointer tree-element"
              >
                <p className="text-lg font-semibold text-white">{file}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col flex-grow h-full code-editor shrink">
          <div className="flex justify-between w-full top">
            <div className="flex files">
              {openFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFile(file)}
                  className={`open-file cursor-pointer p-2 px-4 flex items-center w-fit gap-2 bg-gray-600 ${
                    currentFile === file ? "bg-gray-500" : ""
                  }`}
                >
                  <p className="text-lg font-semibold text-white">{file}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-2 actions">
              <button
                onClick={async () => {
                  await webContainer.mount(fileTree);

                  const installProcess = await webContainer.spawn("npm", [
                    "install",
                  ]);

                  installProcess.output.pipeTo(
                    new WritableStream({
                      write(chunk) {
                        console.log(chunk);
                      },
                    })
                  );

                  if (runProcess) {
                    runProcess.kill();
                  }

                  let tempRunProcess = await webContainer.spawn("npm", [
                    "start",
                  ]);

                  tempRunProcess.output.pipeTo(
                    new WritableStream({
                      write(chunk) {
                        console.log(chunk);
                      },
                    })
                  );

                  setRunProcess(tempRunProcess);

                  webContainer.on("server-ready", (port, url) => {
                    console.log(port, url);
                    setIframeUrl(url);
                  });
                }}
                className="p-2 px-4 text-white bg-blue-500"
              >
                run
              </button>
            </div>
          </div>
          <div className="flex flex-grow max-w-full overflow-auto bottom shrink">
            {fileTree[currentFile] && (
              <div className="flex-grow h-full overflow-auto bg-gray-700 code-editor-area">
                <pre className="h-full hljs">
                  <code
                    className="h-full outline-none hljs"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const updatedContent = e.target.innerText;
                      const ft = {
                        ...fileTree,
                        [currentFile]: {
                          file: {
                            contents: updatedContent,
                          },
                        },
                      };
                      setFileTree(ft);
                      saveFileTree(ft);
                    }}
                    dangerouslySetInnerHTML={{
                      __html: hljs.highlight(
                        "javascript",
                        fileTree[currentFile].file.contents
                      ).value,
                    }}
                    style={{
                      whiteSpace: "pre-wrap",
                      paddingBottom: "25rem",
                      counterSet: "line-numbering",
                    }}
                  />
                </pre>
              </div>
            )}
          </div>
        </div>

        {iframeUrl && webContainer && (
          <div className="flex flex-col h-full min-w-96">
            <div className="address-bar">
              <input
                type="text"
                onChange={(e) => setIframeUrl(e.target.value)}
                value={iframeUrl}
                className="w-full p-2 px-4 text-white bg-gray-600"
              />
            </div>
            <iframe src={iframeUrl} className="w-full h-full"></iframe>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative max-w-full p-4 bg-gray-700 rounded-md w-96">
            <header className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Select User</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2">
                <i className="text-white ri-close-fill"></i>
              </button>
            </header>
            <div className="flex flex-col gap-2 mb-16 overflow-auto users-list max-h-96">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`user cursor-pointer hover:bg-gray-600 ${
                    Array.from(selectedUserId).indexOf(user._id) != -1
                      ? "bg-gray-600"
                      : ""
                  } p-2 flex gap-2 items-center`}
                  onClick={() => handleUserClick(user._id)}
                >
                  <div className="relative flex items-center justify-center p-5 text-white bg-gray-500 rounded-full aspect-square w-fit h-fit">
                    <i className="absolute ri-user-fill"></i>
                  </div>
                  <h1 className="text-lg font-semibold text-white">
                    {user.email}
                  </h1>
                </div>
              ))}
            </div>
            <button
              onClick={addCollaborators}
              className="absolute px-4 py-2 text-white transform -translate-x-1/2 bg-blue-500 rounded-md bottom-4 left-1/2"
            >
              Add Collaborators
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Project;
