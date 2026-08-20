import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

import { useNavigate } from "react-router-dom";

const PROJECT_COLORS = [
  {
    name: "Cardinal",
    value: "#c8102e",
  },
  {
    name: "Gold",
    value: "#f1be48",
  },
  {
    name: "Brown",
    value: "#524727",
  },
  {
    name: "Olive",
    value: "#9b945f",
  },
  {
    name: "Sage",
    value: "#cac7a7",
  },
];

const PROJECT_STATUSES = [
  {
    value: "planning",
    label: "Planning",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "on-hold",
    label: "On Hold",
  },
  {
    value: "complete",
    label: "Complete",
  },
];

const NEW_CATEGORY_VALUE =
  "__new__";

function Projects() {
  const navigate = useNavigate();
  const [
    projects,
    setProjects,
  ] = useState([]);

  const [
    tasks,
    setTasks,
  ] = useState([]);

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editingProjectId,
    setEditingProjectId,
  ] = useState(null);

  const [
    name,
    setName,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("");

  const [
    newCategory,
    setNewCategory,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("planning");

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  const [
    color,
    setColor,
  ] = useState(
    PROJECT_COLORS[0].value
  );

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  /*
   * LOAD PROJECTS
   */

  useEffect(() => {
    const projectsQuery =
      query(
        collection(
          db,
          "projects"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        projectsQuery,
        (snapshot) => {
          setProjects(
            snapshot.docs.map(
              (projectDoc) => ({
                id:
                  projectDoc.id,

                ...projectDoc.data(),
              })
            )
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * LOAD TASKS
   */

  useEffect(() => {
    const tasksQuery =
      query(
        collection(
          db,
          "tasks"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        tasksQuery,
        (snapshot) => {
          setTasks(
            snapshot.docs.map(
              (taskDoc) => ({
                id:
                  taskDoc.id,

                ...taskDoc.data(),
              })
            )
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * CATEGORIES
   */

  const categories =
    useMemo(() => {
      const values =
        projects
          .map(
            (project) =>
              project.category?.trim()
          )
          .filter(Boolean);

      return [
        ...new Set(values),
      ].sort((a, b) =>
        a.localeCompare(b)
      );
    }, [projects]);

  const filteredProjects =
    useMemo(() => {
      if (
        categoryFilter ===
        "all"
      ) {
        return projects;
      }

      if (
        categoryFilter ===
        "uncategorized"
      ) {
        return projects.filter(
          (project) =>
            !project.category?.trim()
        );
      }

      return projects.filter(
        (project) =>
          project.category ===
          categoryFilter
      );
    }, [
      projects,
      categoryFilter,
    ]);

  /*
   * PROJECT TASK HELPERS
   */

  const getProjectTasks =
    (projectId) =>
      tasks.filter(
        (task) =>
          task.projectId ===
          projectId
      );

  const taskIsComplete =
    (task) => {
      if (
        task.completed === true
      ) {
        return true;
      }

      return (
        task.status === "done"
      );
    };

  const getProjectStats =
    (projectId) => {
      const projectTasks =
        getProjectTasks(
          projectId
        );

      const total =
        projectTasks.length;

      const completed =
        projectTasks.filter(
          taskIsComplete
        ).length;

      const open =
        total - completed;

      const progress =
        total === 0
          ? 0
          : Math.round(
            (completed /
              total) *
            100
          );

      return {
        total,
        completed,
        open,
        progress,
      };
    };

  /*
   * FORM HELPERS
   */

  const resetForm = () => {
    setName("");
    setDescription("");

    setSelectedCategory("");
    setNewCategory("");

    setStatus("planning");
    setDueDate("");

    setColor(
      PROJECT_COLORS[0].value
    );

    setEditingProjectId(
      null
    );
  };

  const openCreateModal =
    () => {
      resetForm();

      setModalOpen(true);
    };

  const openEditModal =
    (project) => {
      setEditingProjectId(
        project.id
      );

      setName(
        project.name || ""
      );

      setDescription(
        project.description ||
        ""
      );

      const projectCategory =
        project.category?.trim() ||
        "";

      if (!projectCategory) {
        setSelectedCategory("");
        setNewCategory("");
      } else if (
        categories.includes(
          projectCategory
        )
      ) {
        setSelectedCategory(
          projectCategory
        );

        setNewCategory("");
      } else {
        setSelectedCategory(
          NEW_CATEGORY_VALUE
        );

        setNewCategory(
          projectCategory
        );
      }

      setStatus(
        project.status ||
        "planning"
      );

      setDueDate(
        project.dueDate || ""
      );

      setColor(
        project.color ||
        PROJECT_COLORS[0].value
      );

      setModalOpen(true);
    };

  const closeModal = () => {
    setModalOpen(false);

    resetForm();
  };

  /*
   * CREATE / UPDATE
   */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (!name.trim()) {
        return;
      }

      let finalCategory = "";

      if (
        selectedCategory ===
        NEW_CATEGORY_VALUE
      ) {
        finalCategory =
          newCategory.trim();
      } else {
        finalCategory =
          selectedCategory.trim();
      }

      const projectData = {
        name:
          name.trim(),

        description:
          description.trim(),

        category:
          finalCategory,

        status,

        dueDate:
          dueDate || null,

        color,
      };

      if (editingProjectId) {
        await updateDoc(
          doc(
            db,
            "projects",
            editingProjectId
          ),
          {
            ...projectData,

            updatedAt:
              serverTimestamp(),
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            "projects"
          ),
          {
            ...projectData,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      closeModal();
    };

  /*
   * DELETE
   */

  const handleDelete =
    async (project) => {
      const stats =
        getProjectStats(
          project.id
        );

      let message =
        `Delete "${project.name}"?`;

      if (stats.total > 0) {
        message +=
          `\n\nThis project has ${stats.total} task${stats.total === 1
            ? ""
            : "s"
          }. The tasks will not be deleted, but they will no longer have a valid project.`;
      }

      const confirmed =
        window.confirm(message);

      if (!confirmed) {
        return;
      }

      await deleteDoc(
        doc(
          db,
          "projects",
          project.id
        )
      );
    };

  /*
   * PROJECT COUNTS
   */

  const activeProjects =
    useMemo(
      () =>
        projects.filter(
          (project) =>
            project.status ===
            "active"
        ),
      [projects]
    );

  const completedProjects =
    useMemo(
      () =>
        projects.filter(
          (project) =>
            project.status ===
            "complete"
        ),
      [projects]
    );

  /*
   * FORMATTERS
   */

  const getStatusLabel =
    (statusValue) =>
      PROJECT_STATUSES.find(
        (item) =>
          item.value ===
          statusValue
      )?.label ||
      "Planning";

  const formatDueDate =
    (dateString) => {
      if (!dateString) {
        return "No due date";
      }

      const [
        year,
        month,
        day,
      ] =
        dateString.split("-");

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      ).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
    };

  return (
    <>
      <header className="page-header projects-page-header">
        <div>
          <p className="eyebrow">
            CMDC
          </p>

          <h1>
            Projects
          </h1>

          <p className="date">
            Keep larger pieces
            of work organized
            in one place.
          </p>
        </div>

        <button
          type="button"
          className="primary-button projects-add-button"
          onClick={
            openCreateModal
          }
        >
          + New Project
        </button>
      </header>

      <section className="projects-summary">
        <div className="projects-summary-card">
          <span>
            Total
          </span>

          <strong>
            {projects.length}
          </strong>
        </div>

        <div className="projects-summary-card">
          <span>
            Active
          </span>

          <strong>
            {
              activeProjects.length
            }
          </strong>
        </div>

        <div className="projects-summary-card">
          <span>
            Complete
          </span>

          <strong>
            {
              completedProjects.length
            }
          </strong>
        </div>
      </section>

      {projects.length >
        0 && (
          <section className="projects-toolbar">
            <div className="projects-category-filter">
              <span className="projects-filter-label">
                Category
              </span>

              <select
                value={
                  categoryFilter
                }
                onChange={(
                  event
                ) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All Categories
                </option>

                {categories.map(
                  (
                    categoryName
                  ) => (
                    <option
                      key={
                        categoryName
                      }
                      value={
                        categoryName
                      }
                    >
                      {categoryName}
                    </option>
                  )
                )}

                <option value="uncategorized">
                  Uncategorized
                </option>
              </select>
            </div>

            <span className="projects-filter-count">
              {
                filteredProjects.length
              }{" "}
              {filteredProjects.length ===
                1
                ? "project"
                : "projects"}
            </span>
          </section>
        )}

      {projects.length === 0 ? (
        <section className="projects-empty">
          <div className="projects-empty-icon">
            ◇
          </div>

          <h2>
            No projects yet
          </h2>

          <p>
            Create a project to
            group related work,
            deadlines, notes,
            and tasks.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={
              openCreateModal
            }
          >
            Create Project
          </button>
        </section>
      ) : filteredProjects.length ===
        0 ? (
        <section className="projects-empty projects-empty--filtered">
          <div className="projects-empty-icon">
            ◇
          </div>

          <h2>
            No projects in this
            category
          </h2>

          <p>
            Choose another category
            or create a new project.
          </p>
        </section>
      ) : (
        <section className="projects-grid">
          {filteredProjects.map(
            (project) => {
              const stats =
                getProjectStats(
                  project.id
                );

              return (
                <article
                  key={project.id}
                  className="project-card project-card--clickable"
                  style={{
                    "--project-color":
                      project.color ||
                      PROJECT_COLORS[0].value,
                  }}
                  onClick={() =>
                    navigate(
                      `/projects/${project.id}`
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();

                      navigate(
                        `/projects/${project.id}`
                      );
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <div className="project-card-accent" />

                  <div className="project-card-header">
                    <div className="project-card-title-wrap">
                      <span className="project-color-dot" />

                      <div>
                        {project.category && (
                          <span className="project-category">
                            {
                              project.category
                            }
                          </span>
                        )}

                        <h2>
                          {
                            project.name
                          }
                        </h2>

                        <span
                          className={`project-status project-status--${project.status ||
                            "planning"
                            }`}
                        >
                          {getStatusLabel(
                            project.status
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="project-card-menu">
                      <button
                        type="button"
                        className="project-card-menu-button"
                        onClick={(event) => {
                          event.stopPropagation();

                          openEditModal(project);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="project-card-menu-button project-card-menu-button--delete"
                        onClick={(event) => {
                          event.stopPropagation();

                          handleDelete(project);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {project.description ? (
                    <p className="project-description">
                      {
                        project.description
                      }
                    </p>
                  ) : (
                    <p className="project-description project-description--empty">
                      No description
                      added.
                    </p>
                  )}

                  <div className="project-card-footer">
                    <div>
                      <span className="project-meta-label">
                        Due
                      </span>

                      <strong>
                        {formatDueDate(
                          project.dueDate
                        )}
                      </strong>
                    </div>

                    <div>
                      <span className="project-meta-label">
                        Tasks
                      </span>

                      <strong>
                        {stats.open}{" "}
                        open
                      </strong>
                    </div>
                  </div>

                  <div className="project-progress">
                    <div className="project-progress-header">
                      <span>
                        {stats.total ===
                          0
                          ? "No tasks yet"
                          : `${stats.completed} of ${stats.total} complete`}
                      </span>

                      <strong>
                        {
                          stats.progress
                        }
                        %
                      </strong>
                    </div>

                    <div className="project-progress-track">
                      <div
                        className="project-progress-fill"
                        style={{
                          width: `${stats.progress}%`,
                        }}
                      />
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}

      {modalOpen && (
        <div
          className="project-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="project-modal">
            <div className="project-modal-header">
              <div>
                <p className="eyebrow">
                  {editingProjectId
                    ? "EDIT"
                    : "NEW"}
                </p>

                <h2>
                  {editingProjectId
                    ? "Edit Project"
                    : "Create Project"}
                </h2>
              </div>

              <button
                type="button"
                className="project-modal-close"
                onClick={
                  closeModal
                }
              >
                ×
              </button>
            </div>

            <form
              className="project-form"
              onSubmit={
                handleSubmit
              }
            >
              <label>
                Project Name

                <input
                  type="text"
                  value={name}
                  onChange={(
                    event
                  ) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Project name"
                  autoFocus
                />
              </label>

              <label>
                Category

                <select
                  value={
                    selectedCategory
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event.target.value;

                    setSelectedCategory(
                      value
                    );

                    if (
                      value !==
                      NEW_CATEGORY_VALUE
                    ) {
                      setNewCategory(
                        ""
                      );
                    }
                  }}
                >
                  <option value="">
                    No Category
                  </option>

                  {categories.map(
                    (
                      categoryName
                    ) => (
                      <option
                        key={
                          categoryName
                        }
                        value={
                          categoryName
                        }
                      >
                        {
                          categoryName
                        }
                      </option>
                    )
                  )}

                  <option
                    value={
                      NEW_CATEGORY_VALUE
                    }
                  >
                    + New Category...
                  </option>
                </select>
              </label>

              {selectedCategory ===
                NEW_CATEGORY_VALUE && (
                  <label className="project-new-category-field">
                    New Category Name

                    <input
                      type="text"
                      value={
                        newCategory
                      }
                      onChange={(
                        event
                      ) =>
                        setNewCategory(
                          event.target.value
                        )
                      }
                      placeholder="Example: LTI Review"
                      autoFocus
                    />
                  </label>
                )}

              <label>
                Description

                <textarea
                  value={
                    description
                  }
                  onChange={(
                    event
                  ) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="What is this project for?"
                  rows="4"
                />
              </label>

              <div className="project-form-row">
                <label>
                  Status

                  <select
                    value={status}
                    onChange={(
                      event
                    ) =>
                      setStatus(
                        event.target.value
                      )
                    }
                  >
                    {PROJECT_STATUSES.map(
                      (
                        statusOption
                      ) => (
                        <option
                          key={
                            statusOption.value
                          }
                          value={
                            statusOption.value
                          }
                        >
                          {
                            statusOption.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Due Date

                  <input
                    type="date"
                    value={
                      dueDate
                    }
                    onChange={(
                      event
                    ) =>
                      setDueDate(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <fieldset className="project-color-fieldset">
                <legend>
                  Project Color
                </legend>

                <div className="project-color-options">
                  {PROJECT_COLORS.map(
                    (
                      colorOption
                    ) => (
                      <button
                        key={
                          colorOption.value
                        }
                        type="button"
                        className={`project-color-option ${color ===
                          colorOption.value
                          ? "project-color-option--selected"
                          : ""
                          }`}
                        style={{
                          "--option-color":
                            colorOption.value,
                        }}
                        onClick={() =>
                          setColor(
                            colorOption.value
                          )
                        }
                        aria-label={
                          colorOption.name
                        }
                        title={
                          colorOption.name
                        }
                      >
                        <span />
                      </button>
                    )
                  )}
                </div>
              </fieldset>

              <div className="project-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingProjectId
                    ? "Save Changes"
                    : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Projects;