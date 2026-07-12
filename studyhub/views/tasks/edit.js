<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> - StudyHub</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <%- include('../partials/nav') %>
  <main>
    <div class="card">
      <h1>Edit Task</h1>

      <% if (locals.error) { %>
        <div class="alert alert-error"><%= error %></div>
      <% } %>

      <form action="/tasks/edit/<%= task.task_id %>" method="POST">
        <div class="form-group">
          <label for="title">Task Title *</label>
          <input type="text" id="title" name="title" maxlength="100" required
            value="<%= task.title %>">
        </div>

        <div class="form-group">
          <label for="task_type">Task Type *</label>
          <select id="task_type" name="task_type" required>
            <% VALID_TASK_TYPES.forEach(t => { %>
              <option value="<%= t %>" <%= task.task_type === t ? 'selected' : '' %>><%= t %></option>
            <% }) %>
          </select>
        </div>

        <div class="form-group">
          <label for="module">Module *</label>
          <select id="module" name="module" required>
            <% VALID_MODULES.forEach(mod => { %>
              <option value="<%= mod %>" <%= task.module === mod ? 'selected' : '' %>><%= mod %></option>
            <% }) %>
          </select>
        </div>

        <div class="form-group">
          <label for="due_date">Due Date *</label>
          <input type="date" id="due_date" name="due_date" required
            value="<%= task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '' %>">
        </div>

        <div class="form-group">
          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <% VALID_STATUSES.forEach(s => { %>
              <option value="<%= s %>" <%= task.status === s ? 'selected' : '' %>><%= s %></option>
            <% }) %>
          </select>
        </div>

        <button type="submit" class="btn">Save Changes</button>
        <a href="/tasks" class="btn btn-secondary">Cancel</a>
      </form>
    </div>
  </main>
</body>
</html>